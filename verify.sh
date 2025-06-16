#!/usr/bin/env bash
set -euo pipefail

echo "🔍 1. Type‐checking…"
npm run check

echo "📦 2. Building…"
npm run build

echo "⚠️ 3. Security audit…"
npm audit --production --audit-level=moderate

echo "✅ All checks passed!"