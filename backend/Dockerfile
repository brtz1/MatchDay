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

# Start the server
CMD ["npm", "start"]
