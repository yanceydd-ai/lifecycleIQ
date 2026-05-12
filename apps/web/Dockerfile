# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

# Copy workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install all deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

# Build Next.js (output: standalone is set in next.config.ts)
RUN pnpm --filter=@lifecycleiq/web build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

# Next.js standalone output mirrors the monorepo structure.
# Copying it to /app gives us apps/web/server.js at /app/apps/web/server.js
COPY --from=builder /app/apps/web/.next/standalone ./

# Static assets must be in the location the standalone server expects
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Public directory (CSV import templates, etc.)
COPY --from=builder /app/apps/web/public ./apps/web/public

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
