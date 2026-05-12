# Docker Compose Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package LifecycleIQ as three Docker containers (Postgres, NestJS API, Next.js web) orchestrated by Docker Compose for production deployment on an internal on-prem server.

**Architecture:** Each app gets a multi-stage Dockerfile with the monorepo root as build context (required for `packages/shared`). The builder stage runs `pnpm install + build`; the production stage copies only built output and `node_modules`. A root `docker-compose.yml` wires the three services on a shared bridge network. A `docker-compose.dev.yml` runs only Postgres for local development.

**Tech Stack:** Docker, Docker Compose v2, Node 20 Alpine, pnpm 9, Next.js standalone output, Prisma `migrate deploy`.

**Worktree:** `feature/docker-deploy` from `master` at `/Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy`

---

## File Map

| File | Action |
|------|--------|
| `.dockerignore` | Create — root-level context filter |
| `.env.example` | Create — secrets template |
| `docker-compose.yml` | Create — production (db + api + web) |
| `docker-compose.dev.yml` | Create — dev db only |
| `apps/api/Dockerfile` | Create — multi-stage NestJS build |
| `apps/web/Dockerfile` | Create — multi-stage Next.js standalone build |
| `apps/web/next.config.ts` | Modify — add `output: 'standalone'` |

---

## Task 1: Worktree Setup

**Files:** none

- [ ] **Step 1: Create the worktree**

```bash
cd /Users/david/LifeCycleIQ_Claude
git worktree add .worktrees/docker-deploy -b feature/docker-deploy
```

- [ ] **Step 2: Verify baseline API tests still pass**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy/apps/api
pnpm install
npx jest --no-coverage 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
git commit --allow-empty -m "chore: start docker-deploy worktree from master"
```

---

## Task 2: Foundation Files — `.dockerignore`, `.env.example`, `next.config.ts`

**Files:**
- Create: `.dockerignore`
- Create: `.env.example`
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Create `/.dockerignore`** at the repo root

```
.git
.worktrees
node_modules
apps/api/node_modules
apps/api/dist
apps/web/node_modules
apps/web/.next
packages/shared/node_modules
docs
*.md
**/.env
**/.env.local
**/.env.*.local
```

- [ ] **Step 2: Create `/.env.example`** at the repo root

```
# Database (used by both db and api containers)
POSTGRES_USER=lifecycleiq
POSTGRES_PASSWORD=changeme_use_strong_password

# API
JWT_SECRET=changeme_use_a_long_random_string
JWT_EXPIRES_IN=7d

# Web — set to the server's IP or hostname
NEXTAUTH_URL=http://192.168.1.100:3000
AUTH_SECRET=changeme_use_a_long_random_string_min_32_chars
```

- [ ] **Step 3: Modify `apps/web/next.config.ts`**

Replace the entire file with:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@lifecycleiq/shared'],
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy/apps/web
npx tsc --noEmit 2>&1 | head -5
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
git add .dockerignore .env.example apps/web/next.config.ts
git commit -m "chore: add .dockerignore, .env.example, enable Next.js standalone output"
```

---

## Task 3: API Dockerfile

**Files:**
- Create: `apps/api/Dockerfile`

- [ ] **Step 1: Create `apps/api/Dockerfile`**

```dockerfile
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
```

- [ ] **Step 2: Test the build**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
docker build -f apps/api/Dockerfile . -t lifecycleiq-api-test 2>&1 | tail -10
```

Expected: `Successfully built <sha>` with no errors.

If the build fails, read the full output (`docker build ... 2>&1`) and fix the issue before continuing.

- [ ] **Step 3: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
git add apps/api/Dockerfile
git commit -m "feat: add API Dockerfile (multi-stage NestJS build)"
```

---

## Task 4: Web Dockerfile

**Files:**
- Create: `apps/web/Dockerfile`

- [ ] **Step 1: Create `apps/web/Dockerfile`**

```dockerfile
# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

# Copy workspace manifests
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

# Next.js standalone output mirrors the monorepo structure:
# .next/standalone/ contains apps/web/server.js and a minimal node_modules
COPY --from=builder /app/apps/web/.next/standalone ./

# Static assets must be copied alongside the standalone server
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Public directory (contains CSV import templates)
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

# server.js is at apps/web/server.js inside the standalone output
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 2: Test the build**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
docker build -f apps/web/Dockerfile . -t lifecycleiq-web-test 2>&1 | tail -10
```

Expected: `Successfully built <sha>` with no errors.

If the build fails on the `next build` step with a type error or import error, run `docker build ... 2>&1 | grep -A3 "error"` to see the full error.

- [ ] **Step 3: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
git add apps/web/Dockerfile
git commit -m "feat: add web Dockerfile (multi-stage Next.js standalone build)"
```

---

## Task 5: docker-compose.yml + docker-compose.dev.yml

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`

- [ ] **Step 1: Create `docker-compose.yml`** at the repo root

```yaml
name: lifecycleiq

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: lifecycleiq
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - lifecycleiq_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d lifecycleiq"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/lifecycleiq
      DIRECT_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/lifecycleiq
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
      NODE_ENV: production
      PORT: 3001
    ports:
      - "3001:3001"
    networks:
      - lifecycleiq_net

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    restart: unless-stopped
    depends_on:
      - api
    environment:
      API_URL: http://api:3001
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      NODE_ENV: production
      PORT: 3000
      HOSTNAME: "0.0.0.0"
    ports:
      - "3000:3000"
    networks:
      - lifecycleiq_net

volumes:
  pgdata:

networks:
  lifecycleiq_net:
```

- [ ] **Step 2: Create `docker-compose.dev.yml`** at the repo root

```yaml
name: lifecycleiq-dev

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: lifecycleiq
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata-dev:/var/lib/postgresql/data

volumes:
  pgdata-dev:
```

- [ ] **Step 3: Validate compose syntax**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
POSTGRES_USER=test POSTGRES_PASSWORD=test JWT_SECRET=test AUTH_SECRET=test_auth_secret_min_32 NEXTAUTH_URL=http://localhost:3000 docker compose config 2>&1 | head -20
```

Expected: the resolved config prints without errors.

```bash
docker compose -f docker-compose.dev.yml config 2>&1 | head -10
```

Expected: dev config prints without errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
git add docker-compose.yml docker-compose.dev.yml
git commit -m "feat: add docker-compose.yml (production) and docker-compose.dev.yml (dev db)"
```

---

## Task 6: Smoke Test + Final Docs

**Files:** none (verification only + README update)

- [ ] **Step 1: Copy `.env.example` to `.env` and fill in test values**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
cp .env.example .env
```

Edit `.env` to set real (or test) values:

```
POSTGRES_USER=lifecycleiq
POSTGRES_PASSWORD=testpassword123
JWT_SECRET=test_jwt_secret_long_enough_for_testing
JWT_EXPIRES_IN=7d
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=test_auth_secret_must_be_at_least_32_chars_long
```

Note: `.env` is git-ignored. Do not commit it.

- [ ] **Step 2: Build and start all services**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
docker compose up --build -d 2>&1 | tail -20
```

Expected: all three services start. This takes a few minutes on first build.

- [ ] **Step 3: Verify all containers are running**

```bash
docker compose ps
```

Expected output — all three should show `running` or `healthy`:
```
NAME                  STATUS
lifecycleiq-db-1      running (healthy)
lifecycleiq-api-1     running
lifecycleiq-web-1     running
```

- [ ] **Step 4: Verify the web app responds**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: `200` or `307` (redirect to login).

- [ ] **Step 5: Verify the API responds**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/auth/me
```

Expected: `401` (unauthorized — the API is up and responding).

- [ ] **Step 6: Check API logs for migration output**

```bash
docker compose logs api 2>&1 | head -20
```

Expected: lines like `Applying migration ...` or `No pending migrations` confirming Prisma ran.

- [ ] **Step 7: Stop the test stack**

```bash
docker compose down
```

- [ ] **Step 8: Remove the test `.env`**

```bash
rm /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy/.env
```

- [ ] **Step 9: Final commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/docker-deploy
git add -A
git commit -m "chore: Docker Compose deployment complete" --allow-empty
```

---

## Deployment instructions (for the server)

Once the PR is merged, on the target server:

```bash
git clone <repo-url> lifecycleiq
cd lifecycleiq
cp .env.example .env
# Edit .env with real credentials
docker compose up -d --build
```

To update after a code push:
```bash
git pull
docker compose up -d --build
```

Postgres data persists in the `pgdata` Docker volume across updates.

To seed initial data after first deploy:
```bash
docker compose exec api npx ts-node prisma/seed.ts
```
