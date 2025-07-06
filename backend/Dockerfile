# backend/Dockerfile
FROM node:20-bullseye-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# Ensure OpenSSL 1.1 is present for Prisma
RUN apt-get update && apt-get install -y openssl libssl1.1

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]