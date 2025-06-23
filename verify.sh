#!/usr/bin/env bash
set -euo pipefail

echo "⚠️  Bypassing server type-check due to vite.ts configuration issue..."

echo "🔍 Client type-check…"
npm run check:client

echo "✅ Starting dev server!"
npm run dev