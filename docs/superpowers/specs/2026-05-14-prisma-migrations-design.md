# Prisma Migrations — Design Spec

**Goal:** Replace `prisma db push --accept-data-loss` with `prisma migrate deploy` so schema changes in production are tracked, reversible, and safe.

---

## Problem

The current Dockerfile CMD runs `prisma db push --skip-generate --accept-data-loss`. This:
- Silently drops columns or tables when a schema change conflicts (`--accept-data-loss`)
- Leaves no migration history — no way to know what changed or roll back
- Bypasses Prisma's safety checks entirely

Three migration directories exist (`phase3_budget`, `phase4_recommendations`, `phase5a_scenarios`) but were never applied via `migrate deploy` — they were applied via `db push` and are not tracked in `_prisma_migrations`. They represent incomplete, unreliable history.

---

## Solution

Replace the ad-hoc migration directories with a single baseline migration representing the complete current schema, then switch the startup command to `prisma migrate deploy`.

---

## Changes

### 1. Remove old migration directories

Delete:
- `apps/api/prisma/migrations/20260506000000_phase3_budget/`
- `apps/api/prisma/migrations/20260508000000_phase4_recommendations/`
- `apps/api/prisma/migrations/20260510000000_phase5a_scenarios/`

These were applied via `db push` and are not in `_prisma_migrations`. Keeping them would cause `migrate deploy` to attempt creating already-existing tables on any existing database.

### 2. Generate baseline migration

Generate full-schema SQL using Prisma's diff tool (no database connection required):

```bash
cd apps/api
mkdir -p prisma/migrations/20260514000000_init
pnpm exec prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > prisma/migrations/20260514000000_init/migration.sql
```

This produces a single `migration.sql` that creates all enums, tables, and indexes from scratch. It becomes the authoritative starting point — `migrate deploy` will run it on a fresh database and record it in `_prisma_migrations`.

All future schema changes (new columns, tables, indexes) get new numbered migration files added on top of this baseline.

### 3. Update Dockerfile CMD

**File:** `apps/api/Dockerfile`

Change the CMD from:
```
CMD ["sh", "-c", "node_modules/.bin/prisma db push --skip-generate --accept-data-loss && node dist/apps/api/src/main.js"]
```

To:
```
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/apps/api/src/main.js"]
```

The `prisma` directory (schema + migrations) is already copied into the production image at build time by the existing `COPY --from=builder /app/apps/api/prisma ./apps/api/prisma` instruction — no other Dockerfile changes needed.

---

## What Does NOT Change

- `apps/api/prisma/schema.prisma` — unchanged
- Dockerfile build stages — unchanged
- `docker-compose.yml` — unchanged
- All application code — unchanged
- Developer workflow (`pnpm db:generate`, local dev) — unchanged

---

## Adding Future Migrations

When the schema needs to change after this baseline is in place:

```bash
# 1. Edit schema.prisma
# 2. Generate the migration file (requires a running local DB)
pnpm --filter=@lifecycleiq/api exec prisma migrate dev --name describe_the_change

# 3. Commit the new migration file alongside the schema change
git add apps/api/prisma/
git commit -m "feat: add <table/column> migration"
```

The new migration file is automatically picked up by `migrate deploy` on next deploy.

---

## File Map

| File | Action |
|------|--------|
| `apps/api/prisma/migrations/20260506000000_phase3_budget/` | Delete |
| `apps/api/prisma/migrations/20260508000000_phase4_recommendations/` | Delete |
| `apps/api/prisma/migrations/20260510000000_phase5a_scenarios/` | Delete |
| `apps/api/prisma/migrations/20260514000000_init/migration.sql` | Create — full baseline SQL |
| `apps/api/Dockerfile` | Modify — update CMD |
