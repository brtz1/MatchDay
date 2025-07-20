# backend/Dockerfile

FROM node:20-bullseye-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm install

# Install system dependencies needed by Prisma & healthchecks
RUN apt-get update && \
    apt-get install -y openssl libssl1.1 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy Prisma schema and generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Expose application port
EXPOSE 4000

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Use the script as the container entrypoint
ENTRYPOINT ["./entrypoint.sh"]

# Needed for ts-node and paths (used during dev/testing)
ENV NODE_OPTIONS="--require ts-node/register --require tsconfig-paths/register"
