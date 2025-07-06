FROM node:20-bullseye-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# install openssl for Prisma + curl for healthcheck
RUN apt-get update && apt-get install -y openssl libssl1.1 curl

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
COPY src/data ./src/data
COPY src/utils ./src/utils

RUN npx prisma generate
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
