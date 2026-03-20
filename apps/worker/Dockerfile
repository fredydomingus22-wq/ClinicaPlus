# ClinicaPlus Worker — Dockerfile
# Multi-stage build para o Railway Worker service

# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar manifests e lockfile do workspace
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/events/package.json ./packages/events/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/

# Instalar todas as dependências
RUN pnpm install --frozen-lockfile

# Copiar fontes
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/events ./packages/events
COPY apps/api/prisma ./apps/api/prisma
COPY apps/worker ./apps/worker

# Gerar Prisma Client (worker usa o mesmo schema da API)
RUN pnpm --filter=api exec prisma generate

# Build packages e worker
RUN pnpm --filter=@clinicaplus/types build
RUN pnpm --filter=@clinicaplus/utils build
RUN pnpm --filter=@clinicaplus/events build
RUN pnpm --filter=worker build

# Stage 2: Imagem de produção
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar ficheiros built e node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json
COPY --from=builder /app/packages/events/dist ./packages/events/dist
COPY --from=builder /app/packages/events/node_modules ./packages/events/node_modules
COPY --from=builder /app/packages/events/package.json ./packages/events/package.json

COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./

WORKDIR /app/apps/worker

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
