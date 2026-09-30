# SD Worx Knowledge Compass

Hackathon POC: ingest heterogeneous sources with **Vertex AI Gemini (ADC)**, normalize them to **Quartz Markdown** (wikilinks + frontmatter), and visualize connections in a real **Quartz** graph.

## Architecture

1. Upload a source on `/ingest`
2. `POST /api/ingest` calls Vertex AI Gemini via Application Default Credentials
3. Markdown is written to `quartz/content/`
4. Quartz (`npm run quartz:dev`) renders notes + graph on http://localhost:8080

## Auth (required — API keys are blocked)

Your Google Cloud org disallows API keys. Use ADC:

```bash
# Option A — Labs / Agent Platform helper
bash <(curl -sSL https://storage.googleapis.com/cloud-samples-data/adc/setup_adc.sh)

# Option B — gcloud CLI
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

Then set the project in `.env`:

```bash
cp .env.example .env
# GOOGLE_CLOUD_PROJECT=your-lab-project-id
# GOOGLE_CLOUD_LOCATION=us-central1
# GOOGLE_GENAI_USE_ENTERPRISE=true
# VERTEX_GEMINI_MODEL=gemini-2.0-flash-001
```

If you get `aiplatform.endpoints.predict` 403 on `global/gemini-2.0-flash-001`, switch to `us-central1` (done above) or `VERTEX_GEMINI_MODEL=gemini-2.5-flash`. Your ADC user also needs `roles/aiplatform.user` on the Qwiklabs project.

## Setup

```bash
npm install
npm run quartz:setup   # once: install Quartz deps + plugins
```

## Run (two terminals)

```bash
# Terminal 1 — Next.js UI
npm run dev
# http://localhost:3000  →  /ingest

# Terminal 2 — Quartz knowledge garden
npm run quartz:dev
# http://localhost:8080  → graph + backlinks
```

## Notes

- Seed notes already live in `quartz/content/` (Belgium Bonus, Teams conflict, France Termination).
- Ranking / conflicts (role B2) remains separate from this ingest path.
- Never commit secrets or service-account JSON.
