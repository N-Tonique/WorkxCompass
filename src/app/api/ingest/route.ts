import { NextResponse } from "next/server";
import {
  convertSourceToMarkdown,
  getVertexConfig,
} from "@/lib/gemini-ingest";
import {
  listExistingNoteTitles,
  writeQuartzNote,
} from "@/lib/quartz-content";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const { project } = getVertexConfig();
  if (!project) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_CLOUD_PROJECT is missing. Set it in .env, then authenticate with Application Default Credentials (API keys are disabled by org policy).",
      },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected a file field named 'file'." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 12 MB for the POC)." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const existingTitles = await listExistingNoteTitles();

  try {
    const converted = await convertSourceToMarkdown({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes,
      existingTitles,
    });

    const written = await writeQuartzNote(converted.title, converted.markdown);
    const localFallback = converted.markdown.includes("ingestMode: local-fallback");

    return NextResponse.json({
      slug: written.slug,
      title: converted.title,
      filename: written.filename,
      markdown: converted.markdown,
      links: converted.links,
      detected: converted.detected,
      quartzUrl: "http://localhost:8080",
      mode: localFallback ? "local-fallback" : "vertex",
      warning: localFallback
        ? "Vertex org policy blocked Gemini models. Used local auto-detection fallback for type/language/context."
        : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Vertex AI ingestion failed.";
    const isIam =
      /aiplatform\.endpoints\.predict|PERMISSION_DENIED|IAM_PERMISSION_DENIED/i.test(
        message,
      );
    const hint = isIam
      ? " Your ADC identity lacks Vertex AI access on this Qwiklabs project. Re-auth with the LAB student account."
      : /credential|adc|unauthenticated|401/i.test(message)
        ? " Authenticate with ADC: bash <(curl -sSL https://storage.googleapis.com/cloud-samples-data/adc/setup_adc.sh)"
        : "";
    return NextResponse.json({ error: `${message}${hint}` }, { status: 502 });
  }
}
