# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

# Copy workspace manifests first — maximises layer cache reuse on source changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all deps (including devDeps needed for nest build + prisma generate)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Generate Prisma client and build NestJS
RUN pnpm --filter=@lifecycleiq/api exec prisma generate
RUN pnpm --filter=@lifecycleiq/api build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production PORT=3001

# Copy node_modules — Docker COPY follows pnpm symlinks, producing a flat copy
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy built output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Copy Prisma schema + migrations (required for prisma migrate deploy)
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3001

# Run from the api subdirectory so Prisma finds ./prisma/schema.prisma
# and Node.js walks up to /app/node_modules for package resolution
WORKDIR /app/apps/api

CMD ["sh", "-c", "../../node_modules/.bin/prisma migrate deploy && node dist/main.js"]
