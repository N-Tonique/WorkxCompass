import { createHash, randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import {
  type ExistingCard,
  extractWikilinks,
  findMatchingCard,
  listExistingCards,
  pathUsedByOtherId,
  slugifyTitle,
  writeQuartzNote,
  writeQuartzNoteAtFilename,
} from "@/lib/quartz-content";

export type DetectedAttributes = {
  sourceType: string;
  language: string;
  country?: string;
  domain?: string;
  topic?: string;
  fileKind: string;
};

export type IngestAction = "unchanged" | "create" | "update" | "needs_review";

export type StructuredIngestResponse = {
  action: IngestAction;
  titre_propose: string;
  resume: string;
  knowledgeType: string;
  flashcard: unknown;
  Preuves_Source: unknown;
  Relations_Candidates: unknown;
  liens_a_recalculer: string[];
  markdown_content: string;
  Alertes: string[];
};

export type IngestResult = {
  title: string;
  slug: string;
  markdown: string;
  links: string[];
  detected: DetectedAttributes;
  action: IngestAction;
  knowledgeType?: string;
  resume?: string;
  alertes: string[];
  liensARecalculer: string[];
  written: boolean;
  filename?: string;
  cardId?: string;
  mode: "vertex" | "local-fallback";
  warning?: string;
};

const TEXT_MIME = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
]);

export function computeSourceFingerprint(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function inferSourceFormat(filename: string, mimeType: string): "pdf" | "email_msg" | "teams" {
  const hay = `${filename} ${mimeType}`.toLowerCase();
  if (hay.includes("teams") || hay.includes("chat")) return "teams";
  if (
    hay.includes("email") ||
    hay.includes("msg") ||
    hay.includes("eml") ||
    hay.includes("outlook")
  ) {
    return "email_msg";
  }
  if (hay.includes("pdf") || filename.toLowerCase().endsWith(".pdf")) return "pdf";
  return "pdf";
}

function buildPrompt(params: {
  filename: string;
  mimeType: string;
  fingerprint: string;
  extractedText: string;
  sourceDate: string;
  existingCard?: ExistingCard;
  existingTitles: string[];
}) {
  const {
    filename,
    mimeType,
    fingerprint,
    extractedText,
    sourceDate,
    existingCard,
    existingTitles,
  } = params;
  const titles =
    existingTitles.length > 0
      ? existingTitles.map((t) => `- ${t}`).join("\n")
      : "- (aucune)";
  const format = inferSourceFormat(filename, mimeType);
  const sourceId = `src_${fingerprint.slice(0, 16)}`;

  const carteBlock = existingCard
    ? `CARTE_EXISTANTE:
- id: ${existingCard.id ?? "(aucun)"}
- titre: ${existingCard.title}
- fichier: ${existingCard.filename}
- source: ${existingCard.source ?? "(inconnue)"}
- empreinte: ${existingCard.sourceFingerprint ?? "(inconnue)"}
- version: ${existingCard.version ?? "1"}
- knowledgeType: ${existingCard.knowledgeType ?? "(inconnu)"}
- domaine: ${existingCard.domaine ?? "(inconnu)"}
- sous-domaine: ${existingCard.sousDomaine ?? "(inconnu)"}
- statut: ${existingCard.statut ?? "(inconnu)"}
- markdown:
\`\`\`markdown
${existingCard.markdown.slice(0, 6000)}
\`\`\``
    : `CARTE_EXISTANTE: aucune (première ingestion de cette source).`;

  const excerptBlock =
    extractedText.trim().length > 0
      ? extractedText.slice(0, 8000)
      : "(aucun texte extractible fourni — analyser le binaire joint si disponible)";

  return `Ta tâche est d’analyser une source interne, de remplir une flashcard fidèle à cette source et de préparer la création ou la mise à jour de sa fiche Markdown.

Entrées fournies

SOURCE : identifiant stable, chemin ou URL, format (pdf, email_msg ou teams), version/empreinte, date et texte extrait avec emplacements (page, paragraphe ou ID de message).

SOURCE:
- identifiant_stable: ${sourceId}
- chemin_ou_url: ${filename}
- format: ${format}
- mimeType: ${mimeType}
- version_empreinte: ${fingerprint}
- date: ${sourceDate}
- texte_extrait_avec_emplacements:
"""
${excerptBlock}
"""

${carteBlock}

Compare l’empreinte de SOURCE à celle de CARTE_EXISTANTE.

Même empreinte : action unchanged, aucune réécriture.

Nouvelle source : action create.

Source modifiée : action update, avec conservation de l’ID et liste des liens à recalculer.

Information trop ambiguë ou source inexploitable : action needs_review, avec explication.

Prépare un Markdown contenant un frontmatter avec ID, version, titre, source, knowledgeType, domaine, sous-domaine et statut, puis les sections : Résumé, Intention de recherche, Corps de connaissance, Preuves source, Liens candidats et Alertes. Le Markdown doit correspondre exactement aux champs structurés.

Retourne uniquement une réponse structurée contenant : action, titre_propose, resume, knowledgeType, flashcard, Preuves_Source, Relations_Candidates, liens_a_recalculer, markdown_content et Alertes.

Si tu disposes d’un outil d’écriture, écris ou mets à jour le fichier seulement après validation de la réponse et vérification qu’aucun autre ID n’utilise son chemin. Sinon, retourne le contenu et l’action proposée. Ne prétends jamais avoir modifié un fichier sans confirmation de l’outil.

Retourne UNIQUEMENT une réponse JSON valide (pas de prose hors JSON) contenant :
{
  "action": "unchanged" | "create" | "update" | "needs_review",
  "titre_propose": string,
  "resume": string,
  "knowledgeType": string,
  "flashcard": object,
  "Preuves_Source": array|object,
  "Relations_Candidates": array,
  "liens_a_recalculer": string[],
  "markdown_content": string,
  "Alertes": string[]
}

Contraintes Markdown (markdown_content):
- Frontmatter YAML avec: id, version, titre (ou title), source, sourceFingerprint, knowledgeType, domaine, sous-domaine, statut, tags
- Sections exactes:
  ## Résumé
  ## Intention de recherche
  ## Corps de connaissance
  ## Preuves source
  ## Liens candidats
  ## Alertes
- Dans Liens candidats, utilise des wikilinks [[Titre Exact]] vers les notes pertinentes.
- Notes existantes utilisables pour les liens:
${titles}

Si action=unchanged, markdown_content peut reprendre la carte existante.
Si action=update, conserve le même id que CARTE_EXISTANTE.
Si action=create, génère un nouvel id UUID.
Si action=needs_review, explique dans Alertes pourquoi.
`;
}

function stripCodeFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json|markdown|md)?\s*/i, "").replace(/\s*```$/, "");
  }
  return t.trim();
}

function parseStructuredResponse(raw: string): StructuredIngestResponse {
  const cleaned = stripCodeFences(raw);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Réponse IA non JSON.");
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<StructuredIngestResponse>;
  const action = parsed.action;
  if (
    action !== "unchanged" &&
    action !== "create" &&
    action !== "update" &&
    action !== "needs_review"
  ) {
    throw new Error(`Action IA invalide: ${String(action)}`);
  }
  return {
    action,
    titre_propose: String(parsed.titre_propose ?? "Sans titre"),
    resume: String(parsed.resume ?? ""),
    knowledgeType: String(parsed.knowledgeType ?? "unknown"),
    flashcard: parsed.flashcard ?? {},
    Preuves_Source: parsed.Preuves_Source ?? [],
    Relations_Candidates: parsed.Relations_Candidates ?? [],
    liens_a_recalculer: Array.isArray(parsed.liens_a_recalculer)
      ? parsed.liens_a_recalculer.map(String)
      : [],
    markdown_content: String(parsed.markdown_content ?? ""),
    Alertes: Array.isArray(parsed.Alertes) ? parsed.Alertes.map(String) : [],
  };
}

function ensureStructuredMarkdown(
  markdown: string,
  opts: {
    id: string;
    version: string;
    title: string;
    source: string;
    fingerprint: string;
    knowledgeType: string;
    domaine?: string;
    sousDomaine?: string;
    statut: string;
    resume: string;
    alertes: string[];
    relations: unknown;
  },
): string {
  let md = stripCodeFences(markdown);
  if (md.startsWith("---")) return md;

  const relations = Array.isArray(opts.relations)
    ? opts.relations
    : [];
  const linkLines = relations
    .map((r) => {
      if (typeof r === "string") return `- [[${r}]]`;
      if (r && typeof r === "object" && "titre" in r) {
        return `- [[${String((r as { titre: string }).titre)}]]`;
      }
      if (r && typeof r === "object" && "title" in r) {
        return `- [[${String((r as { title: string }).title)}]]`;
      }
      return null;
    })
    .filter(Boolean);

  return [
    "---",
    `id: ${opts.id}`,
    `version: ${opts.version}`,
    `title: ${opts.title}`,
    `titre: ${opts.title}`,
    `source: ${opts.source}`,
    `sourceFingerprint: ${opts.fingerprint}`,
    `knowledgeType: ${opts.knowledgeType}`,
    opts.domaine ? `domaine: ${opts.domaine}` : null,
    opts.sousDomaine ? `sous-domaine: ${opts.sousDomaine}` : null,
    `statut: ${opts.statut}`,
    "---",
    "",
    `# ${opts.title}`,
    "",
    "## Résumé",
    "",
    opts.resume || "(vide)",
    "",
    "## Intention de recherche",
    "",
    `Trouver la connaissance applicable issue de \`${opts.source}\`.`,
    "",
    "## Corps de connaissance",
    "",
    opts.resume || "(à compléter)",
    "",
    "## Preuves source",
    "",
    `- Source: ${opts.source}`,
    `- Empreinte: ${opts.fingerprint}`,
    "",
    "## Liens candidats",
    "",
    ...(linkLines.length > 0 ? linkLines : ["- (aucun)"]),
    "",
    "## Alertes",
    "",
    ...(opts.alertes.length > 0
      ? opts.alertes.map((a) => `- ${a}`)
      : ["- (aucune)"]),
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
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

export type VertexEndpoint = {
  project: string;
  location: string;
  model: string;
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

export function getVertexEndpointCandidates(): VertexEndpoint[] {
  const primary = getVertexConfig();
  const project = primary.project;
  if (!project) return [];

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
      candidates.push({ project, location, model, enterprise: true });
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

  const asLatin = bytes.toString("latin1");
  const chunks = asLatin.match(/[\x20-\x7E\n\r\t]{5,}/g) ?? [];
  return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 4000);
}

async function applyValidatedWrite(params: {
  action: IngestAction;
  structured: StructuredIngestResponse;
  existingCard?: ExistingCard;
  fingerprint: string;
  sourceLabel: string;
  detected: DetectedAttributes;
}): Promise<{
  written: boolean;
  filename?: string;
  markdown: string;
  title: string;
  cardId: string;
  alertes: string[];
}> {
  const { action, structured, existingCard, fingerprint, sourceLabel, detected } =
    params;
  const alertes = [...structured.Alertes];
  const cardId =
    action === "update" && existingCard?.id
      ? existingCard.id
      : action === "unchanged" && existingCard?.id
        ? existingCard.id
        : randomUUID();

  const version =
    action === "update"
      ? String(Number(existingCard?.version ?? "1") + 1)
      : existingCard?.version ?? "1";

  const markdown = ensureStructuredMarkdown(structured.markdown_content, {
    id: cardId,
    version,
    title: structured.titre_propose,
    source: sourceLabel,
    fingerprint,
    knowledgeType: structured.knowledgeType,
    domaine: detected.domain,
    sousDomaine: detected.topic,
    statut:
      action === "needs_review"
        ? "needs_review"
        : action === "unchanged"
          ? existingCard?.statut ?? "active"
          : "active",
    resume: structured.resume,
    alertes,
    relations: structured.Relations_Candidates,
  });

  if (action === "unchanged" || action === "needs_review") {
    return {
      written: false,
      filename: existingCard?.filename,
      markdown:
        action === "unchanged" && existingCard
          ? existingCard.markdown
          : markdown,
      title: structured.titre_propose,
      cardId,
      alertes,
    };
  }

  const targetFilename =
    action === "update" && existingCard
      ? existingCard.filename
      : `${structured.titre_propose.replace(/[<>:"/\\|?*]/g, "").trim() || "carte"}.md`;

  const conflict = await pathUsedByOtherId(targetFilename, cardId);
  if (conflict) {
    alertes.push(
      `Chemin déjà utilisé par un autre ID: ${targetFilename}. Écriture annulée.`,
    );
    return {
      written: false,
      markdown,
      title: structured.titre_propose,
      cardId,
      alertes,
    };
  }

  const written =
    action === "update"
      ? await writeQuartzNoteAtFilename(targetFilename, markdown)
      : await writeQuartzNote(structured.titre_propose, markdown);

  return {
    written: true,
    filename: written.filename,
    markdown,
    title: structured.titre_propose,
    cardId,
    alertes,
  };
}

export async function convertSourceLocally(params: {
  filename: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<IngestResult> {
  const { filename, mimeType, bytes } = params;
  const fingerprint = computeSourceFingerprint(bytes);
  const cards = await listExistingCards();
  const existingCard = findMatchingCard(cards, {
    fingerprint,
    sourceLabel: filename,
  });
  const excerpt = extractRoughText(bytes, mimeType, filename);
  const detected = detectAttributesLocally({
    filename,
    mimeType,
    text: excerpt,
  });

  let action: IngestAction = "create";
  if (existingCard?.sourceFingerprint === fingerprint) action = "unchanged";
  else if (existingCard) action = "update";
  if (excerpt.trim().length < 20 && !filename.toLowerCase().endsWith(".pdf")) {
    action = "needs_review";
  }

  const title = existingCard?.title ?? titleFromFilename(filename);
  const cardId = existingCard?.id ?? randomUUID();
  const structured: StructuredIngestResponse = {
    action,
    titre_propose: title,
    resume:
      excerpt.slice(0, 420) ||
      "Source peu exploitable en fallback local.",
    knowledgeType: detected.sourceType,
    flashcard: {
      question: `Que dit la source ${filename} ?`,
      answer: excerpt.slice(0, 280) || "À revoir",
    },
    Preuves_Source: [{ source: filename, excerpt: excerpt.slice(0, 220) }],
    Relations_Candidates: cards.slice(0, 3).map((c) => c.title),
    liens_a_recalculer: action === "update" ? extractWikilinks(existingCard?.markdown ?? "") : [],
    markdown_content: "",
    Alertes:
      action === "needs_review"
        ? ["Fallback local: source ambiguë ou trop courte."]
        : ["Fallback local (Vertex indisponible / policy)."],
  };

  const applied = await applyValidatedWrite({
    action,
    structured,
    existingCard,
    fingerprint,
    sourceLabel: filename,
    detected,
  });

  return {
    title: applied.title,
    slug: slugifyTitle(applied.title),
    markdown: applied.markdown,
    links: extractWikilinks(applied.markdown),
    detected,
    action,
    knowledgeType: structured.knowledgeType,
    resume: structured.resume,
    alertes: applied.alertes,
    liensARecalculer: structured.liens_a_recalculer,
    written: applied.written,
    filename: applied.filename,
    cardId: applied.cardId,
    mode: "local-fallback",
    warning:
      "Vertex indisponible ou bloqué. Décision d'action et Markdown produits en fallback local.",
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
}): Promise<IngestResult> {
  const { filename, mimeType, bytes } = params;
  const allowLocal =
    process.env.INGEST_ALLOW_LOCAL_FALLBACK === undefined ||
    /^(1|true|yes)$/i.test(process.env.INGEST_ALLOW_LOCAL_FALLBACK ?? "true");

  const fingerprint = computeSourceFingerprint(bytes);
  const cards = await listExistingCards();
  const existingCard = findMatchingCard(cards, {
    fingerprint,
    sourceLabel: filename,
  });
  const existingTitles = cards.map((c) => c.title);
  const roughText = extractRoughText(bytes, mimeType, filename);
  const detected = detectAttributesLocally({
    filename,
    mimeType,
    text: roughText,
  });

  // Fast-path: same fingerprint already stored.
  if (existingCard?.sourceFingerprint === fingerprint) {
    return {
      title: existingCard.title,
      slug: slugifyTitle(existingCard.title),
      markdown: existingCard.markdown,
      links: extractWikilinks(existingCard.markdown),
      detected,
      action: "unchanged",
      knowledgeType: existingCard.knowledgeType,
      resume: "Empreinte identique — aucune réécriture.",
      alertes: [],
      liensARecalculer: [],
      written: false,
      filename: existingCard.filename,
      cardId: existingCard.id,
      mode: "vertex",
    };
  }

  const candidates = getVertexEndpointCandidates();
  if (candidates.length === 0) {
    if (allowLocal) return convertSourceLocally({ filename, mimeType, bytes });
    throw new Error(
      "GOOGLE_CLOUD_PROJECT is missing. Set it in .env (Vertex AI + ADC).",
    );
  }

  const prompt = buildPrompt({
    filename,
    mimeType,
    fingerprint,
    extractedText: roughText,
    sourceDate: new Date().toISOString(),
    existingCard,
    existingTitles,
  });

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
      text: `\n\n--- CONTENU SOURCE (${filename}) ---\n${bytes.toString("utf8")}`,
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

  if (!raw.trim()) {
    if (allowLocal) return convertSourceLocally({ filename, mimeType, bytes });
    const detail =
      lastError instanceof Error ? lastError.message : String(lastError ?? "");
    throw new Error(
      `No usable Vertex model. Org policy may block Gen AI models. Last error: ${detail}`,
    );
  }

  const structured = parseStructuredResponse(raw);
  const applied = await applyValidatedWrite({
    action: structured.action,
    structured,
    existingCard,
    fingerprint,
    sourceLabel: filename,
    detected,
  });

  return {
    title: applied.title,
    slug: slugifyTitle(applied.title),
    markdown: applied.markdown,
    links: extractWikilinks(applied.markdown),
    detected,
    action: structured.action,
    knowledgeType: structured.knowledgeType,
    resume: structured.resume,
    alertes: applied.alertes,
    liensARecalculer: structured.liens_a_recalculer,
    written: applied.written,
    filename: applied.filename,
    cardId: applied.cardId,
    mode: "vertex",
  };
}

