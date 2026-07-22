<<<<<<< HEAD
FROM node:20
=======
FROM node:18-alpine AS builder
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a

WORKDIR /app

<<<<<<< HEAD
COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm

RUN pnpm install

COPY . .

=======
COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /usr/src/app .

ENV NODE_ENV=production

>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
EXPOSE 3000

CMD ["pnpm", "start"]