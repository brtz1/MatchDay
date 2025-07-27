#!/bin/sh

echo "⏳ Running migrations before starting the backend…"
npx prisma migrate deploy

echo "🚀 Starting backend server…"
exec node dist/index.js
