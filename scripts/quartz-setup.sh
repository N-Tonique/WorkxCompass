#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
QUARTZ_DIR="$ROOT/quartz"

if [ ! -f "$QUARTZ_DIR/package.json" ]; then
  echo "Cloning Quartz into quartz/..."
  git clone --depth 1 https://github.com/jackyzha0/quartz.git "$QUARTZ_DIR"
  rm -rf "$QUARTZ_DIR/.git"
  if [ ! -f "$QUARTZ_DIR/quartz.config.yaml" ]; then
    cp "$QUARTZ_DIR/quartz.config.default.yaml" "$QUARTZ_DIR/quartz.config.yaml"
  fi
fi

cd "$QUARTZ_DIR"
echo "Installing Quartz dependencies..."
npm install --engine-strict=false
echo "Installing Quartz plugins from config..."
node ./quartz/bootstrap-cli.mjs plugin install --from-config
echo "Quartz setup complete. Run: npm run quartz:dev"
