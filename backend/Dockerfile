# Multistage build for backend to keep image footprint small
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# Production release stage
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]