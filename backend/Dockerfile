FROM node:20

WORKDIR /app

<<<<<<< HEAD
COPY package*.json ./

RUN npm install --legacy-peer-deps
=======
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --no-frozen-lockfile
>>>>>>> 1bb0d8e3107c9be0f3a4e35ca97a5ef60e896263

COPY . .

EXPOSE 3000

CMD ["pnpm", "start"]