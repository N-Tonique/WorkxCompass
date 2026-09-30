import { GoogleGenAI } from "@google/genai";
import {
  extractFrontmatterTitle,
  extractWikilinks,
  slugifyTitle,
} from "@/lib/quartz-content";

export type IngestMeta = {
  country?: string;
  domain?: string;
  topic?: string;
  sourceType?: string;
  language?: string;
};

export type DetectedAttributes = {
  sourceType: string;
  language: string;
  country?: string;
  domain?: string;
  topic?: string;
  fileKind: string;
};

export type IngestResult = {
  title: string;
  slug: string;
  markdown: string;
  links: string[];
  detected: DetectedAttributes;
};

const TEXT_MIME = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
]);

function buildPrompt(existingTitles: string[], filename: string, mimeType: string) {
  const titles =
    existingTitles.length > 0
      ? existingTitles.map((t) => `- ${t}`).join("\n")
      : "- (none yet)";

  return `You are the Knowledge Compass ingestion engine for SD Worx.
Analyze the uploaded organizational source and convert it into a Quartz-compatible Markdown note.

IMPORTANT — detect automatically from the file (do NOT ask the user):
- sourceType: one of pdf | teams | expert_note | procedure (infer from content/style/filename; MIME hint=${mimeType})
- language: ISO 639-1 code of the source content (fr, en, nl, de, …)
- country: ISO country if inferable (prefer BE or FR when relevant), else omit
- domain: Payroll | Time | HR | Tax | Benefits | Other when inferable
- topic: short topic label (e.g. Bonus, Termination, Overtime, Leave, …)

Requirements:
1. Start with YAML frontmatter between --- fences including ALL of:
   - title
   - tags (array including domain, country, topic, language when known)
   - sourceType
   - language
   - country (if known)
   - domain (if known)
   - topic (if known)
2. Write a clear # Title heading matching frontmatter title.
3. Include sections: ## Summary, ## Detected context, ## Key rules (if applicable), ## Provenance, ## Related.
4. In ## Detected context, list the auto-detected sourceType, language, country, domain, topic.
5. In ## Related, add Obsidian-style wikilinks [[Exact Existing Title]] only when relevant.
6. Prefer linking to these existing notes when topical overlap exists:
${titles}
7. Keep content factual, professional, HR/payroll plausible.
8. If the source is thin, still produce a useful summary note; do not invent legal advice.
9. Output ONLY the Markdown document — no code fences wrapping the whole file.

Filename hint: ${filename}
`;
}

function parseFrontmatterValue(block: string, key: string): string | undefined {
  const line = block
    .split("\n")
    .find((l) => new RegExp(`^${key}\\s*:`).test(l));
  if (!line) return undefined;
  return line
    .replace(new RegExp(`^${key}\\s*:`), "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function extractFrontmatterBlock(markdown: string): string | null {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  return match?.[1] ?? null;
}

export function extractDetectedAttributes(
  markdown: string,
  fallback: DetectedAttributes,
): DetectedAttributes {
  const block = extractFrontmatterBlock(markdown);
  if (!block) return fallback;

  return {
    sourceType: parseFrontmatterValue(block, "sourceType") || fallback.sourceType,
    language: parseFrontmatterValue(block, "language") || fallback.language,
    country: parseFrontmatterValue(block, "country") || fallback.country,
    domain: parseFrontmatterValue(block, "domain") || fallback.domain,
    topic: parseFrontmatterValue(block, "topic") || fallback.topic,
    fileKind: fallback.fileKind,
  };
}

function detectLanguageHeuristic(text: string): string {
  const sample = text.toLowerCase();
  const frHits = (
    sample.match(
      /\b(le|la|les|des|une|pour|avec|employé|salaire|congés|licenciement|prime|belgique|france)\b/g,
    ) ?? []
  ).length;
  const nlHits = (
    sample.match(
      /\b(de|het|een|voor|met|werknemer|loon|vakantie|belgie|onslag)\b/g,
    ) ?? []
  ).length;
  const enHits = (
    sample.match(
      /\b(the|and|employee|payroll|bonus|termination|overtime|belgium|france|procedure)\b/g,
    ) ?? []
  ).length;
  if (frHits >= enHits && frHits >= nlHits && frHits > 0) return "fr";
  if (nlHits > enHits && nlHits > 0) return "nl";
  if (enHits > 0) return "en";
  return "und";
}

function detectSourceTypeHeuristic(filename: string, mimeType: string, text: string): string {
  const hay = `${filename} ${text}`.toLowerCase();
  if (/teams|chat|message|thread|channel/.test(hay)) return "teams";
  if (/expert|note de|memo|opinion/.test(hay)) return "expert_note";
  if (/procedure|policy|checklist|official|règlement|reglement/.test(hay)) {
    return "procedure";
  }
  if (mimeType.includes("pdf") || filename.toLowerCase().endsWith(".pdf")) return "pdf";
  if (filename.toLowerCase().endsWith(".md") || filename.toLowerCase().endsWith(".txt")) {
    return "expert_note";
  }
  return "procedure";
}

function detectCountryHeuristic(text: string, filename: string): string | undefined {
  const hay = `${filename} ${text}`.toLowerCase();
  if (/\b(belgium|belgique|belgië|belgie|\bbe\b|brussels|bruxelles)\b/.test(hay)) {
    return "BE";
  }
  if (/\b(france|french|\bfr\b|paris)\b/.test(hay)) return "FR";
  return undefined;
}

function detectDomainHeuristic(text: string, filename: string): string | undefined {
  const hay = `${filename} ${text}`.toLowerCase();
  if (/payroll|salaire|paie|rémunération|remuneration|wage/.test(hay)) return "Payroll";
  if (/time|overtime|heures|congés|leave|attendance/.test(hay)) return "Time";
  if (/tax|impôt|impot|social security|onss|urssaf/.test(hay)) return "Tax";
  if (/benefit|avantage|mutuelle/.test(hay)) return "Benefits";
  if (/hr|rh|human resources|ressources humaines/.test(hay)) return "HR";
  return undefined;
}

function detectTopicHeuristic(text: string, filename: string): string | undefined {
  const hay = `${filename} ${text}`.toLowerCase();
  if (/bonus|prime/.test(hay)) return "Bonus";
  if (/termination|licenciement|dismissal|severance|fin de contrat/.test(hay)) {
    return "Termination";
  }
  if (/overtime|heures supplémentaires|heures supplementaires/.test(hay)) {
    return "Overtime";
  }
  if (/leave|congé|conges|vacation|holiday/.test(hay)) return "Leave";
  return undefined;
}

function detectFileKind(filename: string, mimeType: string): string {
  const lower = filename.toLowerCase();
  if (mimeType.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(lower)) {
    return "image";
  }
  if (lower.endsWith(".md") || mimeType.includes("markdown")) return "markdown";
  if (lower.endsWith(".csv") || mimeType.includes("csv")) return "csv";
  if (lower.endsWith(".txt") || mimeType.startsWith("text/")) return "text";
  return mimeType || "unknown";
}

export function detectAttributesLocally(params: {
  filename: string;
  mimeType: string;
  text: string;
}): DetectedAttributes {
  const { filename, mimeType, text } = params;
  return {
    fileKind: detectFileKind(filename, mimeType),
    sourceType: detectSourceTypeHeuristic(filename, mimeType, text),
    language: detectLanguageHeuristic(`${filename} ${text}`),
    country: detectCountryHeuristic(text, filename),
    domain: detectDomainHeuristic(text, filename),
    topic: detectTopicHeuristic(text, filename),
  };
}

function ensureFrontmatter(
  markdown: string,
  detected: DetectedAttributes,
  fallbackTitle: string,
): string {
  let md = markdown.trim();
  if (md.startsWith("```")) {
    md = md.replace(/^```(?:markdown|md)?\n?/i, "").replace(/\n?```$/i, "").trim();
  }

  if (!md.startsWith("---")) {
    const tags = [
      detected.domain,
      detected.country,
      detected.topic,
      detected.language,
      detected.sourceType,
    ].filter(Boolean);
    const fm = [
      "---",
      `title: ${fallbackTitle}`,
      `tags: [${tags.map((t) => JSON.stringify(String(t))).join(", ")}]`,
      `sourceType: ${detected.sourceType}`,
      `language: ${detected.language}`,
      detected.country ? `country: ${detected.country}` : null,
      detected.domain ? `domain: ${detected.domain}` : null,
      detected.topic ? `topic: ${detected.topic}` : null,
      `fileKind: ${detected.fileKind}`,
      "---",
      "",
      `# ${fallbackTitle}`,
      "",
    ]
      .filter((line) => line !== null)
      .join("\n");
    md = `${fm}${md}`;
  } else {
    // Enrich missing keys in existing frontmatter.
    const block = extractFrontmatterBlock(md) ?? "";
    const missing: string[] = [];
    if (!parseFrontmatterValue(block, "language")) {
      missing.push(`language: ${detected.language}`);
    }
    if (!parseFrontmatterValue(block, "sourceType")) {
      missing.push(`sourceType: ${detected.sourceType}`);
    }
    if (detected.country && !parseFrontmatterValue(block, "country")) {
      missing.push(`country: ${detected.country}`);
    }
    if (detected.domain && !parseFrontmatterValue(block, "domain")) {
      missing.push(`domain: ${detected.domain}`);
    }
    if (detected.topic && !parseFrontmatterValue(block, "topic")) {
      missing.push(`topic: ${detected.topic}`);
    }
    if (missing.length > 0) {
      md = md.replace(/^---\s*\n/, `---\n${missing.join("\n")}\n`);
    }
  }

  return md;
}

export type VertexEndpoint = {
  project: string;
  location: string;
  model: string;
  /** Agent Platform / Vertex cloud backend (ADC). */
  enterprise: boolean;
};

export function getVertexConfig(): VertexEndpoint {
  const project =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "";
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
  const model = process.env.VERTEX_GEMINI_MODEL || "gemini-2.0-flash-001";
  const enterpriseEnv = process.env.GOOGLE_GENAI_USE_ENTERPRISE;
  const enterprise =
    enterpriseEnv === undefined
      ? location === "global"
      : /^(1|true|yes)$/i.test(enterpriseEnv);

  return { project, location, model, enterprise };
}

/** Ordered attempts for Qwiklabs / Agent Platform labs. */
export function getVertexEndpointCandidates(): VertexEndpoint[] {
  const primary = getVertexConfig();
  const project = primary.project;
  if (!project) return [];

  // Prefer models commonly allowlisted in labs. Avoid gemini-2.5-* first —
  // many Qwiklabs orgs block them via constraints/vertexai.allowedModels.
  const models = [
    primary.model,
    "gemini-2.0-flash-001",
    "gemini-2.0-flash",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
  ];
  const locations = Array.from(
    new Set([primary.location, "us-central1", "global"]),
  );

  const candidates: VertexEndpoint[] = [];
  for (const location of locations) {
    for (const model of models) {
      candidates.push({
        project,
        location,
        model,
        enterprise: true,
      });
    }
  }

  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = `${c.location}|${c.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRetryableModelError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /PERMISSION_DENIED|403|does not have access|may not exist|NOT_FOUND|404|FAILED_PRECONDITION|allowedModels|disallowed Gen AI model|400/i.test(
    message,
  );
}

function titleFromFilename(filename: string): string {
  return (
    filename
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Ingested source"
  );
}

function extractRoughText(bytes: Buffer, mimeType: string, filename: string): string {
  const isText =
    TEXT_MIME.has(mimeType) ||
    /\.(md|txt|csv|json|xml)$/i.test(filename);
  if (isText) return bytes.toString("utf8").slice(0, 8000);

  // Best-effort PDF text scrape (no external deps): keep printable runs.
  const asLatin = bytes.toString("latin1");
  const chunks = asLatin.match(/[\x20-\x7E\n\r\t]{5,}/g) ?? [];
  return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 4000);
}

export function convertSourceLocally(params: {
  filename: string;
  mimeType: string;
  bytes: Buffer;
  existingTitles: string[];
}): IngestResult {
  const { filename, mimeType, bytes, existingTitles } = params;
  const title = titleFromFilename(filename);
  const excerpt = extractRoughText(bytes, mimeType, filename);
  const detected = detectAttributesLocally({
    filename,
    mimeType,
    text: excerpt,
  });
  const summary =
    excerpt.length > 40
      ? excerpt.slice(0, 420)
      : `Local ingest of ${filename} (Vertex models blocked by org policy). Auto-detected context applied.`;

  const related = existingTitles
    .filter((t) => {
      const hay =
        `${title} ${detected.topic ?? ""} ${detected.domain ?? ""} ${detected.country ?? ""}`.toLowerCase();
      return t
        .toLowerCase()
        .split(/\s+/)
        .some((token) => token.length > 3 && hay.includes(token));
    })
    .slice(0, 4);

  if (related.length === 0 && existingTitles[0]) {
    related.push(existingTitles[0]);
  }

  const tags = [
    detected.domain,
    detected.country,
    detected.topic,
    detected.language,
    detected.sourceType,
  ].filter(Boolean);

  const markdown = [
    "---",
    `title: ${title}`,
    `tags: [${tags.map((t) => JSON.stringify(String(t))).join(", ")}]`,
    `sourceType: ${detected.sourceType}`,
    `language: ${detected.language}`,
    detected.country ? `country: ${detected.country}` : null,
    detected.domain ? `domain: ${detected.domain}` : null,
    detected.topic ? `topic: ${detected.topic}` : null,
    `fileKind: ${detected.fileKind}`,
    "ingestMode: local-fallback",
    "---",
    "",
    `# ${title}`,
    "",
    "## Summary",
    "",
    summary,
    "",
    "## Detected context",
    "",
    `- sourceType: ${detected.sourceType}`,
    `- language: ${detected.language}`,
    `- fileKind: ${detected.fileKind}`,
    detected.country ? `- country: ${detected.country}` : null,
    detected.domain ? `- domain: ${detected.domain}` : null,
    detected.topic ? `- topic: ${detected.topic}` : null,
    "",
    "## Key rules",
    "",
    `- Source file: ${filename}`,
    `- MIME: ${mimeType || "unknown"}`,
    "",
    "## Provenance",
    "",
    `Source label: ${filename}`,
    excerpt
      ? `Excerpt: "${excerpt.slice(0, 220).replace(/"/g, "'")}"`
      : "Excerpt: (binary source — local fallback without Gemini)",
    "",
    "## Related",
    "",
    ...related.map((t) => `- [[${t}]]`),
    "",
    "> Generated by local fallback because Vertex org policy blocked Gemini models.",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    title,
    slug: slugifyTitle(title),
    markdown,
    links: extractWikilinks(markdown),
    detected,
  };
}

async function generateWithEndpoint(
  endpoint: VertexEndpoint,
  parts: Array<
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }
  >,
): Promise<string> {
  const ai = new GoogleGenAI({
    enterprise: endpoint.enterprise,
    project: endpoint.project,
    location: endpoint.location,
  });

  const result = await ai.models.generateContent({
    model: endpoint.model,
    contents: [{ role: "user", parts }],
  });

  return result.text ?? "";
}

export async function convertSourceToMarkdown(params: {
  filename: string;
  mimeType: string;
  bytes: Buffer;
  existingTitles: string[];
}): Promise<IngestResult> {
  const { filename, mimeType, bytes, existingTitles } = params;
  const allowLocal =
    process.env.INGEST_ALLOW_LOCAL_FALLBACK === undefined ||
    /^(1|true|yes)$/i.test(process.env.INGEST_ALLOW_LOCAL_FALLBACK ?? "true");

  const roughText = extractRoughText(bytes, mimeType, filename);
  const heuristic = detectAttributesLocally({
    filename,
    mimeType,
    text: roughText,
  });

  const candidates = getVertexEndpointCandidates();
  if (candidates.length === 0) {
    if (allowLocal) {
      return convertSourceLocally({ filename, mimeType, bytes, existingTitles });
    }
    throw new Error(
      "GOOGLE_CLOUD_PROJECT is missing. Set it in .env (Vertex AI + ADC).",
    );
  }

  const prompt = buildPrompt(existingTitles, filename, mimeType);
  const isText =
    TEXT_MIME.has(mimeType) ||
    filename.endsWith(".md") ||
    filename.endsWith(".txt") ||
    filename.endsWith(".csv");

  const parts: Array<
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }
  > = [{ text: prompt }];

  if (isText) {
    parts.push({
      text: `\n\n--- SOURCE CONTENT (${filename}) ---\n${bytes.toString("utf8")}`,
    });
  } else {
    parts.push({
      inlineData: {
        data: bytes.toString("base64"),
        mimeType: mimeType || "application/octet-stream",
      },
    });
  }

  let raw = "";
  let lastError: unknown;

  for (const endpoint of candidates) {
    try {
      raw = await generateWithEndpoint(endpoint, parts);
      if (raw.trim()) break;
      lastError = new Error(
        `Empty response from ${endpoint.location}/${endpoint.model}`,
      );
    } catch (error) {
      lastError = error;
      if (isRetryableModelError(error)) continue;
      throw error;
    }
  }

  if (raw.trim()) {
    const fallbackTitle = titleFromFilename(filename);
    const markdown = ensureFrontmatter(raw, heuristic, fallbackTitle);
    const title = extractFrontmatterTitle(markdown) ?? fallbackTitle;
    const detected = extractDetectedAttributes(markdown, heuristic);
    return {
      title,
      slug: slugifyTitle(title),
      markdown,
      links: extractWikilinks(markdown),
      detected,
    };
  }

  if (allowLocal) {
    return convertSourceLocally({ filename, mimeType, bytes, existingTitles });
  }

  const detail =
    lastError instanceof Error ? lastError.message : String(lastError ?? "");
  throw new Error(
    `No usable Vertex model. Org policy may block Gen AI models. Last error: ${detail}`,
  );
}
