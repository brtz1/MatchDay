FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# fix for Prisma + OpenSSL
RUN apt-get update && apt-get install -y openssl libssl-dev

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]