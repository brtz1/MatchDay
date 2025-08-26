#!/bin/sh
set -eu

echo "🧨 Resetting & reseeding dev database…"
# Drops DB, reapplies migrations, and runs your configured seed script.
# We skip generate here to avoid duplicate "Generated Prisma Client" spam,
# since the client is already generated at build time.
npx prisma migrate reset --force --skip-generate

echo "🚀 Starting backend server…"
# Run Node directly to avoid npm's 'prestart' lifecycle firing another build.
exec node dist/src/index.js
