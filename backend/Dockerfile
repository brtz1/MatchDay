FROM node:20-bullseye-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# Install system dependencies
RUN apt-get update && \
    apt-get install -y openssl libssl1.1 curl && \
    rm -rf /var/lib/apt/lists/*

COPY . .

RUN npx prisma generate
RUN npm run build

# Optional: remove source after build to force dist-only runtime
RUN rm -rf src

EXPOSE 4000

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
