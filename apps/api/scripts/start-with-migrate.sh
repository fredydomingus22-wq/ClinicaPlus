#!/usr/bin/env sh
set -eu

echo "[boot] Running Prisma migrations (deploy)..."
pnpm exec prisma migrate deploy

if [ "${RUN_DB_SEED_ON_DEPLOY:-false}" = "true" ]; then
  echo "[boot] RUN_DB_SEED_ON_DEPLOY=true -> running prisma db seed..."
  pnpm exec prisma db seed
else
  echo "[boot] RUN_DB_SEED_ON_DEPLOY is not true -> skipping seed."
fi

if [ "${STORAGE_PROVIDER:-local}" = "supabase" ]; then
  echo "[boot] STORAGE_PROVIDER=supabase -> running storage setup..."
  pnpm exec ts-node --project scripts/tsconfig.json scripts/setup-storage.ts || echo "[boot] Storage setup failed, continuing..."
else
  echo "[boot] STORAGE_PROVIDER is not supabase -> skipping storage setup."
fi

echo "[boot] Starting API..."
node dist/server.js
