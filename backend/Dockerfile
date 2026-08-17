FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /usr/src/app .

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pnpm", "start"]