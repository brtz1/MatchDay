FROM node:20-bullseye-slim

WORKDIR /usr/src/app

# 1. Install dependencies
COPY package*.json ./
RUN npm install --network-timeout=600000

# 2. Install system deps
RUN apt-get update && \
    apt-get install -y openssl libssl1.1 curl && \
    rm -rf /var/lib/apt/lists/*

# 3. Copy source & generate Prisma client
COPY . .
RUN npx prisma generate

# 4. Build the project
RUN npm run build

# 5. Copy your JSON data into the dist folder so seed.js can find it
RUN mkdir -p dist/src/data \
    && cp -r src/data/* dist/src/data/

# 6. Expose & launch
EXPOSE 4000
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
