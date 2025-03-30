# Build
FROM node:23.4.0 AS builder
WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build


# Run
FROM node:23.4.0-slim AS production
WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 7001

CMD ["pnpm", "start"]