# Docker Compose Deployment — Design Spec

**Goal:** Package LifecycleIQ for production deployment on an internal on-prem server using Docker Compose, with a minimal dev compose file for running a local PostgreSQL container during development.

---

## Overview

The current dev workflow uses Supabase for the database and runs `pnpm dev` for both apps locally. This spec adds Docker-based production deployment without touching the existing dev workflow (developers continue to use `pnpm dev`; those who want local Postgres can use `docker-compose.dev.yml`).

**Production stack:** three containers on a shared Docker bridge network — `db` (Postgres), `api` (NestJS), `web` (Next.js) — orchestrated by a root `docker-compose.yml`. Secrets are loaded from a root `.env` file on the server (git-ignored). No nginx reverse proxy needed for an internal network.

---

## File Map

| File | Action |
|------|--------|
| `.dockerignore` | Create — root-level ignore for build context |
| `docker-compose.yml` | Create — production (db + api + web) |
| `docker-compose.dev.yml` | Create — dev (db only) |
| `.env.example` | Create — secrets template |
| `apps/api/Dockerfile` | Create — multi-stage NestJS build |
| `apps/web/Dockerfile` | Create — multi-stage Next.js standalone build |
| `apps/web/next.config.ts` | Modify — add `output: 'standalone'` |

---

## Services

| Service | Base image | Host port | Internal port | Depends on |
|---------|-----------|-----------|---------------|-----------|
| `db` | `postgres:16-alpine` | not exposed | 5432 | — |
| `api` | built from `apps/api/Dockerfile` | 3001 | 3001 | `db` (health check) |
| `web` | built from `apps/web/Dockerfile` | 3000 | 3000 | `api` |

All services share a `lifecycleiq_net` bridge network. `db` is only reachable from `api` inside that network.

---

## Environment Variables

**Root `.env` on the production server (never committed):**

```
# Database
POSTGRES_USER=lifecycleiq
POSTGRES_PASSWORD=<strong-password>

# API
JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=7d

# Web
NEXTAUTH_URL=http://<server-ip>:3000
AUTH_SECRET=<long-random-string-min-32-chars>
```

**How they're used in `docker-compose.yml`:**
- `db` gets `POSTGRES_USER` and `POSTGRES_PASSWORD` directly from the root `.env`
- `api` gets `DATABASE_URL` constructed inline: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/lifecycleiq`
- `api` gets `DIRECT_URL` as the same value (no pgbouncer pooler in local Postgres)
- `web` gets `API_URL=http://api:3001` hardcoded (always the Docker service name — not a secret, not server-specific)
- `web` gets `NEXTAUTH_URL` and `AUTH_SECRET` from the root `.env`

---

## Dockerfiles

### `apps/api/Dockerfile`

Two stages. Build context is the **monorepo root**.

**Stage 1 — builder:**
- Base: `node:20-alpine`
- Install pnpm via `npm install -g pnpm`
- Copy `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` from root
- Copy `packages/` (for `@lifecycleiq/shared`)
- Copy `apps/api/package.json`
- Run `pnpm install --frozen-lockfile --filter=@lifecycleiq/api...`
- Copy `apps/api/` source
- Run `pnpm --filter=@lifecycleiq/api exec prisma generate`
- Run `pnpm --filter=@lifecycleiq/api build` → produces `apps/api/dist/`

**Stage 2 — production:**
- Base: `node:20-alpine`
- Copy `dist/` from builder
- Copy `node_modules/` from builder (includes Prisma engine binaries)
- Copy `apps/api/prisma/` (schema + migrations — required for `prisma migrate deploy`)
- Set `NODE_ENV=production`, `PORT=3001`
- Expose 3001
- `CMD`: `sh -c "npx prisma migrate deploy && node dist/main.js"`

Migrations run on every container start via `prisma migrate deploy`. This is safe — Prisma skips already-applied migrations and is idempotent.

### `apps/web/Dockerfile`

Two stages. Build context is the **monorepo root**.

**Stage 1 — builder:**
- Base: `node:20-alpine`
- Install pnpm
- Copy root workspace files + `packages/` + `apps/web/package.json`
- Run `pnpm install --frozen-lockfile --filter=@lifecycleiq/web...`
- Copy `apps/web/` source
- Run `pnpm --filter=@lifecycleiq/web build` → produces `apps/web/.next/standalone/`

**Stage 2 — production:**
- Base: `node:20-alpine`
- Copy `.next/standalone/` from builder (includes `server.js`)
- Copy `.next/static/` into `.next/static/` inside standalone (required by standalone server)
- Copy `public/` if it exists
- Set `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`
- Expose 3000
- `CMD`: `node server.js`

### `apps/web/next.config.ts` change

Add `output: 'standalone'` to the existing config:

```typescript
const nextConfig: NextConfig = {
  transpilePackages: ['@lifecycleiq/shared'],
  output: 'standalone',
};
```

---

## `docker-compose.yml`

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
      HOSTNAME: 0.0.0.0
    ports:
      - "3000:3000"
    networks:
      - lifecycleiq_net

volumes:
  pgdata:

networks:
  lifecycleiq_net:
```

---

## `docker-compose.dev.yml`

Only runs Postgres on `localhost:5432`. Local `.env` files in `apps/api/` and `apps/web/` continue to be used as-is.

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

---

## Root `.dockerignore`

Since both Dockerfiles use the monorepo root as build context, a single root `.dockerignore` keeps the build context small:

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

`.env.example` is intentionally not ignored (it's a template, not a secret).

---

## Deployment workflow

On the server (one-time setup):
```bash
git clone <repo> && cd lifecycleiq
cp .env.example .env
# Edit .env with real values
docker compose up -d --build
```

To update after a code change:
```bash
git pull
docker compose up -d --build
```

Postgres data persists in the `pgdata` named volume across rebuilds.

---

## What this does NOT include

- HTTPS / TLS termination (not needed for internal network; add nginx + certbot later if required)
- CI/CD pipeline (manual `docker compose up --build` on the server)
- Backup/restore for the Postgres volume (operator responsibility)
- Seed data on first run (run `docker compose exec api npx ts-node prisma/seed.ts` manually if needed)
