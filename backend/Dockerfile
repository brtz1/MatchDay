# syntax=docker/dockerfile:1.4

################################################################################
# 1) DEPENDENCIES STAGE: cache npm downloads so rebuilds are fast
################################################################################
FROM node:20-bullseye-slim AS deps

WORKDIR /usr/src/app

# only copy the lockfile & package manifests
COPY package*.json ./

# mount a cache at /root/.npm and bump retry/timeouts
RUN --mount=type=cache,target=/root/.npm \
    npm ci \
      --prefer-offline \
      --progress=false \
      --network-timeout=600000

################################################################################
# 2) BUILDER STAGE: install system deps, generate Prisma client, compile TS
################################################################################
FROM node:20-bullseye-slim AS builder

WORKDIR /usr/src/app

# pull in cached node_modules from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
# install any OS packages needed for build (and Prisma)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      openssl \
      libssl1.1 && \
    rm -rf /var/lib/apt/lists/*

# copy your source
COPY . .

# generate Prisma client & build
RUN npx prisma generate
RUN npm run build

################################################################################
# 3) RUNNER STAGE: slim runtime image with prod-only deps + compiled code
################################################################################
FROM node:20-bullseye-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# copy package manifests so we can install prod-only deps
COPY package*.json ./

# install only prod deps, reusing the same cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci \
      --omit=dev \
      --prefer-offline \
      --progress=false \
      --network-timeout=600000

# copy built artifacts
COPY --from=builder /usr/src/app/dist ./dist
# copy Prisma schema + generated client if needed at runtime
COPY --from=builder /usr/src/app/prisma ./prisma

# copy your entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]
