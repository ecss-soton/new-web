FROM node:18-alpine as base

FROM base as deps

WORKDIR /home/node/app
COPY package.json package-lock.json ./

RUN npm ci

FROM base AS builder

WORKDIR /home/node/app
COPY --from=deps /home/node/app/node_modules ./node_modules

COPY . .
COPY .env.example .env

RUN npm run build

FROM node:18-slim AS runtime

COPY .env.example .env

ENV NODE_ENV=production
ENV PAYLOAD_CONFIG_PATH=dist/payload.config.js

WORKDIR /home/node/app

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --from=builder /home/node/app/dist ./dist
COPY --from=builder /home/node/app/build ./build

EXPOSE 3000

CMD ["node", "dist/server.js"]
