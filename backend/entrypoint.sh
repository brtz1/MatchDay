#!/bin/sh

echo "⏳ Running migrations before starting the backend…"
npx prisma migrate deploy

echo "🚀 Starting backend server…"
npm run start
