# Stage 1: Build the frontend
FROM node:20-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with static web server
FROM node:20-alpine

WORKDIR /app

# Install a static file server like "serve"
RUN npm install -g serve

# Copy built files from previous stage
COPY --from=build /app/dist ./dist

# Expose the default port used by `serve`
EXPOSE 5173

# Serve the static frontend
CMD ["serve", "-s", "dist", "-l", "5173"]
