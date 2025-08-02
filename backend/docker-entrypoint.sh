#!/usr/bin/env sh
set -e

# Destructive reset & re-apply all migrations
npx prisma migrate reset --force

# now start your backend
npm run start   # or whatever your normal start command is
