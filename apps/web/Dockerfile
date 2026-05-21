# ClinicaPlus Web — Dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests & lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json turbo.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/events/package.json ./packages/events/
COPY apps/web/package.json ./apps/web/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/types ./packages/types
COPY packages/ui ./packages/ui
COPY packages/utils ./packages/utils
COPY packages/events ./packages/events
COPY apps/web ./apps/web

# Build dependencies and then web
RUN pnpm --filter=@clinicaplus/types build
RUN pnpm --filter=@clinicaplus/ui build
RUN pnpm --filter=@clinicaplus/utils build
RUN pnpm --filter=@clinicaplus/events build
RUN pnpm --filter=web build

# Stage 2: Production (Serve with Nginx)
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
# Default nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
