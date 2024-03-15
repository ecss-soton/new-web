FROM rust:1.76-buster as build

RUN cargo install stv-rs

FROM node:18-slim as base

FROM base as deps

WORKDIR /home/node/app
COPY package.json package-lock.json ./

RUN npm ci

FROM base AS builder

WORKDIR /home/node/app
COPY --from=deps /home/node/app/node_modules ./node_modules

COPY . .
COPY .env.production .env

RUN --network=host npm run build

FROM node:18-slim AS runtime

COPY .env.example .env

ENV NODE_ENV=production
ENV PAYLOAD_CONFIG_PATH=dist/payload/payload.config.js

WORKDIR /home/node/app

RUN mkdir -p ./.next
COPY --from=builder /home/node/app/.next ./.next
COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --from=builder /home/node/app/dist ./dist
COPY --from=builder /home/node/app/build ./build
COPY --from=builder /home/node/app/public ./public
COPY --from=builder /home/node/app/next.config.js ./next.config.js
COPY --from=builder /home/node/app/redirects.js ./redirects.js
COPY --from=builder /home/node/app/csp.js ./csp.js

COPY --from=build /usr/local/cargo/bin/stv-rs /usr/local/bin/stv-rs

EXPOSE 3000

CMD ["node", "dist/server.js"]
