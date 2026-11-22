# Stage 1: Build workspace (core + api + web)
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.34.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps ./apps

RUN pnpm run build

# Stage 2: Production runtime (Unified Fastify API + SPA static server)
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data

RUN corepack enable && corepack prepare pnpm@10.34.9 --activate && mkdir -p /app/data

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/web/package.json ./apps/web/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
