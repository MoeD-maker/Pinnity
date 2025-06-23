#!/usr/bin/env bash
set -euo pipefail

echo "🔍 1. Server type-check…"
npm run check:server

echo "🔍 2. Client type-check…"
npm run check:client

echo "🧪 3. Unit & integration tests…"
npm test

echo "🌐 4. Cypress E2E tests…"
npm run cypress:run

echo "✅ All checks passed—starting dev server!"
npm run dev