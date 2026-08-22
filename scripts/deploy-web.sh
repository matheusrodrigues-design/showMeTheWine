#!/usr/bin/env bash
# Export Expo web locally (bakes EXPO_PUBLIC_* from .env) and deploy static dist to Vercel.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY"
  exit 1
fi

npx expo export -p web

npx --yes vercel@41.7.8 deploy dist --prod --yes --name show-me-the-wine

echo ""
echo "Configure Supabase Auth → URL Configuration with the printed Vercel URL:"
echo "  https://supabase.com/dashboard/project/pxeiisyefdmtdlkxfats/auth/url-configuration"
echo "Site URL = https://<seu-projeto>.vercel.app"
echo "Redirect URLs += https://<seu-projeto>.vercel.app/**"
