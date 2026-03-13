# ClinicaPlus API — Dockerfile (backup se Railway NIXPACKS falhar)
# Stage 1: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests & lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (frozen for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY apps/api ./apps/api

# Build shared packages first, then API
RUN pnpm --filter=@clinicaplus/types build
RUN pnpm --filter=@clinicaplus/utils build
RUN pnpm --filter=api exec prisma generate
RUN pnpm --filter=api build

# Stage 2: Production image
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built files and node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=builder /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./

WORKDIR /app/apps/api

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
