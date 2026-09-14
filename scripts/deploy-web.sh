#!/usr/bin/env bash
# Export Expo web locally (bakes EXPO_PUBLIC_* from .env) and deploy static dist to Vercel.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env with EXPO_PUBLIC_API_URL"
  exit 1
fi

npx expo export -p web

npx --yes vercel@41.7.8 deploy dist --prod --yes --name show-me-the-wine

echo ""
echo "Testers open the printed Vercel URL. The API URL is baked in from EXPO_PUBLIC_API_URL."
