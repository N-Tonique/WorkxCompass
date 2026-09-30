#!/usr/bin/env bash
# Diagnose which Google identity ADC is using vs the Qwiklabs project.
set -euo pipefail
export PATH="${HOME}/google-cloud-sdk/bin:${PATH}"

PROJECT="${GOOGLE_CLOUD_PROJECT:-$(grep -E '^GOOGLE_CLOUD_PROJECT=' .env 2>/dev/null | cut -d= -f2- || true)}"
PROJECT="${PROJECT:-qwiklabs-gcp-04-d2174180e6a8}"

echo "Project: ${PROJECT}"
echo

if [ ! -f "${HOME}/.config/gcloud/application_default_credentials.json" ]; then
  echo "No ADC file found. Run:"
  echo "  bash <(curl -sSL https://storage.googleapis.com/cloud-samples-data/adc/setup_adc.sh)"
  exit 1
fi

TOKEN="$(gcloud auth application-default print-access-token 2>/dev/null || true)"
if [ -z "${TOKEN}" ]; then
  echo "ADC token unavailable. Re-run ADC setup."
  exit 1
fi

EMAIL="$(curl -s "https://www.googleapis.com/oauth2/v3/userinfo" -H "Authorization: Bearer ${TOKEN}" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("email","?"))')"
echo "ADC identity: ${EMAIL}"

if [[ "${EMAIL}" == *"@gmail.com" ]]; then
  echo
  echo "WARNING: ADC is a personal Gmail account."
  echo "Qwiklabs projects usually only grant Vertex AI to the temporary LAB student account."
  echo "Fix:"
  echo "  1. Open the Labs for Sales / Qwiklabs console for this lab"
  echo "  2. Copy/open the student Google account credentials from the lab"
  echo "  3. Re-run: bash <(curl -sSL https://storage.googleapis.com/cloud-samples-data/adc/setup_adc.sh)"
  echo "  4. Sign in with the LAB account (not ${EMAIL})"
fi

echo
echo "Testing Vertex predict permission..."
CODE="$(curl -s -o /tmp/vertex-probe.json -w '%{http_code}' \
  -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/us-central1/publishers/google/models/gemini-2.0-flash-001:generateContent" \
  -d '{"contents":[{"role":"user","parts":[{"text":"ping"}]}]}')"
echo "HTTP ${CODE}"
python3 - <<'PY'
import json
try:
  d=json.load(open('/tmp/vertex-probe.json'))
except Exception as e:
  print(e); raise SystemExit
err=d.get('error')
if err:
  print(err.get('status'), err.get('message','')[:300])
else:
  print('Vertex predict OK')
PY
