#!/bin/sh
set -e

echo "⏳ Running migrations before starting the backend…"
npx prisma migrate reset --force

echo "⏳ Generating Prisma client…"
npx prisma generate

echo "🚀 Starting backend server…"
npm run start
