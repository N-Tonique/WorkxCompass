import fs from "node:fs/promises";
import path from "node:path";

export type QuartzNote = {
  slug: string;
  title: string;
  filename: string;
  tags: string[];
  links: string[];
  excerpt: string;
};

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

export function getQuartzContentDir(): string {
  const configured = process.env.QUARTZ_CONTENT_DIR;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), "quartz", "content");
}

export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

export function extractWikilinks(markdown: string): string[] {
  const links = new Set<string>();
  for (const match of markdown.matchAll(WIKILINK_RE)) {
    const target = match[1]?.trim();
    if (target) links.add(target);
  }
  return [...links];
}

export function extractFrontmatterTitle(markdown: string): string | null {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const titleLine = match[1]
    .split("\n")
    .find((line) => line.startsWith("title:"));
  if (!titleLine) return null;
  return titleLine.replace(/^title:\s*/, "").replace(/^["']|["']$/g, "").trim();
}

export function extractTags(markdown: string): string[] {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return [];
  const block = match[1];
  const inline = block.match(/tags:\s*\[([^\]]*)\]/);
  if (inline) {
    return inline[1]
      .split(",")
      .map((t) => t.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  const listMatch = block.match(/tags:\s*\n((?:\s*-\s*.+\n?)*)/);
  if (!listMatch) return [];
  return listMatch[1]
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

function excerptFromMarkdown(markdown: string): string {
  const withoutFm = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*/, "");
  const plain = withoutFm
    .replace(/^#.+$/gm, "")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 160);
}

export async function listQuartzNotes(): Promise<QuartzNote[]> {
  const dir = getQuartzContentDir();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const notes: QuartzNote[] = [];
  for (const filename of entries) {
    if (!filename.endsWith(".md")) continue;
    const fullPath = path.join(dir, filename);
    const markdown = await fs.readFile(fullPath, "utf8");
    const title =
      extractFrontmatterTitle(markdown) ??
      filename.replace(/\.md$/, "");
    notes.push({
      slug: slugifyTitle(title),
      title,
      filename,
      tags: extractTags(markdown),
      links: extractWikilinks(markdown),
      excerpt: excerptFromMarkdown(markdown),
    });
  }

  return notes.sort((a, b) => a.title.localeCompare(b.title));
}

export async function listExistingNoteTitles(): Promise<string[]> {
  const notes = await listQuartzNotes();
  return notes.map((n) => n.title).filter((t) => t !== "Knowledge Compass");
}

export async function writeQuartzNote(
  title: string,
  markdown: string,
): Promise<{ filename: string; slug: string; absolutePath: string }> {
  const dir = getQuartzContentDir();
  await fs.mkdir(dir, { recursive: true });
  const safeTitle = title.replace(/[<>:"/\\|?*]/g, "").trim() || "untitled-note";
  const filename = `${safeTitle}.md`;
  const absolutePath = path.join(dir, filename);
  await fs.writeFile(absolutePath, markdown.endsWith("\n") ? markdown : `${markdown}\n`, "utf8");
  return {
    filename,
    slug: slugifyTitle(safeTitle),
    absolutePath,
  };
}

export async function deleteQuartzNote(
  filename: string,
): Promise<{ filename: string }> {
  const base = path.basename(filename);
  if (!base || base !== filename || base.includes("..") || !base.endsWith(".md")) {
    throw new Error("Invalid note filename.");
  }
  if (base.toLowerCase() === "index.md") {
    throw new Error("The Quartz index note cannot be deleted.");
  }

  const dir = getQuartzContentDir();
  const absolutePath = path.join(dir, base);
  const resolvedDir = path.resolve(dir);
  const resolvedFile = path.resolve(absolutePath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    throw new Error("Invalid note path.");
  }

  try {
    await fs.unlink(resolvedFile);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error("Note not found.");
    }
    throw error;
  }

  return { filename: base };
}

export type ExistingCard = {
  id?: string;
  title: string;
  filename: string;
  absolutePath: string;
  markdown: string;
  source?: string;
  sourceFingerprint?: string;
  version?: string;
  knowledgeType?: string;
  domaine?: string;
  sousDomaine?: string;
  statut?: string;
};

function parseFm(block: string, key: string): string | undefined {
  const line = block.split("\n").find((l) => new RegExp(`^${key}\\s*:`).test(l));
  if (!line) return undefined;
  return line
    .replace(new RegExp(`^${key}\\s*:`), "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

export async function listExistingCards(): Promise<ExistingCard[]> {
  const dir = getQuartzContentDir();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const cards: ExistingCard[] = [];
  for (const filename of entries) {
    if (!filename.endsWith(".md") || filename.toLowerCase() === "index.md") {
      continue;
    }
    const absolutePath = path.join(dir, filename);
    const markdown = await fs.readFile(absolutePath, "utf8");
    const fm = markdown.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? "";
    const title =
      parseFm(fm, "title") ||
      parseFm(fm, "titre") ||
      filename.replace(/\.md$/, "");
    cards.push({
      id: parseFm(fm, "id") || parseFm(fm, "ID"),
      title,
      filename,
      absolutePath,
      markdown,
      source: parseFm(fm, "source"),
      sourceFingerprint:
        parseFm(fm, "sourceFingerprint") || parseFm(fm, "empreinte"),
      version: parseFm(fm, "version"),
      knowledgeType:
        parseFm(fm, "knowledgeType") || parseFm(fm, "knowledge_type"),
      domaine: parseFm(fm, "domaine") || parseFm(fm, "domain"),
      sousDomaine:
        parseFm(fm, "sous-domaine") ||
        parseFm(fm, "sous_domaine") ||
        parseFm(fm, "sousDomaine"),
      statut: parseFm(fm, "statut") || parseFm(fm, "status"),
    });
  }
  return cards;
}

export function findMatchingCard(
  cards: ExistingCard[],
  opts: { fingerprint: string; sourceLabel: string },
): ExistingCard | undefined {
  const byFp = cards.find((c) => c.sourceFingerprint === opts.fingerprint);
  if (byFp) return byFp;
  const label = opts.sourceLabel.toLowerCase();
  return cards.find(
    (c) =>
      (c.source && c.source.toLowerCase() === label) ||
      c.filename.toLowerCase() === `${label}.md`.toLowerCase() ||
      c.filename.toLowerCase() === label,
  );
}

export async function pathUsedByOtherId(
  proposedFilename: string,
  cardId: string,
): Promise<boolean> {
  const base = path.basename(proposedFilename);
  const dir = getQuartzContentDir();
  const absolutePath = path.join(dir, base);
  try {
    const markdown = await fs.readFile(absolutePath, "utf8");
    const fm = markdown.match(/^---\s*\n([\s\S]*?)\n---/)?.[1] ?? "";
    const existingId = parseFm(fm, "id") || parseFm(fm, "ID");
    if (!existingId) return true; // occupied without id — treat as conflict
    return existingId !== cardId;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return false;
    throw error;
  }
}

export async function writeQuartzNoteAtFilename(
  filename: string,
  markdown: string,
): Promise<{ filename: string; slug: string; absolutePath: string }> {
  const base = path.basename(filename);
  if (!base.endsWith(".md") || base.includes("..")) {
    throw new Error("Invalid note filename.");
  }
  const dir = getQuartzContentDir();
  await fs.mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, base);
  const resolvedDir = path.resolve(dir);
  const resolvedFile = path.resolve(absolutePath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    throw new Error("Invalid note path.");
  }
  await fs.writeFile(
    absolutePath,
    markdown.endsWith("\n") ? markdown : `${markdown}\n`,
    "utf8",
  );
  return {
    filename: base,
    slug: slugifyTitle(base.replace(/\.md$/, "")),
    absolutePath,
  };
}

export async function readQuartzNote(filename: string): Promise<{
  filename: string;
  title: string;
  markdown: string;
  body: string;
  tags: string[];
  links: string[];
}> {
  const base = path.basename(filename);
  if (!base || base !== filename || base.includes("..") || !base.endsWith(".md")) {
    throw new Error("Invalid note filename.");
  }

  const dir = getQuartzContentDir();
  const absolutePath = path.join(dir, base);
  const resolvedDir = path.resolve(dir);
  const resolvedFile = path.resolve(absolutePath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
    throw new Error("Invalid note path.");
  }

  let markdown: string;
  try {
    markdown = await fs.readFile(resolvedFile, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new Error("Note not found.");
    throw error;
  }

  const title =
    extractFrontmatterTitle(markdown) ?? base.replace(/\.md$/, "");
  const body = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*/, "");

  return {
    filename: base,
    title,
    markdown,
    body,
    tags: extractTags(markdown),
    links: extractWikilinks(markdown),
  };
}

