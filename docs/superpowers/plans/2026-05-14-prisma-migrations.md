# Prisma Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `prisma db push --accept-data-loss` with `prisma migrate deploy` so production schema changes are tracked and safe.

**Architecture:** Delete the 3 ad-hoc migration directories (applied via `db push`, never tracked in `_prisma_migrations`). Generate a single baseline migration from the current schema using `prisma migrate diff --from-empty` (no database connection needed). Swap the Dockerfile CMD to `prisma migrate deploy`. No code changes — infrastructure only.

**Tech Stack:** Prisma v5 `migrate diff` + `migrate deploy`, Docker multi-stage build.

**Worktree:** `feature/prisma-migrations` from `master` at `/Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations`

---

## File Map

| File | Action |
|------|--------|
| `apps/api/prisma/migrations/20260506000000_phase3_budget/` | Delete |
| `apps/api/prisma/migrations/20260508000000_phase4_recommendations/` | Delete |
| `apps/api/prisma/migrations/20260510000000_phase5a_scenarios/` | Delete |
| `apps/api/prisma/migrations/20260514000000_init/migration.sql` | Create — full baseline SQL |
| `apps/api/Dockerfile` | Modify — update CMD line |

---

## Task 1: Worktree Setup + Baseline

**Files:** none

- [ ] **Step 1: Create the worktree**

```bash
cd /Users/david/LifeCycleIQ_Claude
git worktree add .worktrees/prisma-migrations -b feature/prisma-migrations
```

- [ ] **Step 2: Verify baseline tests pass**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations/apps/api
pnpm db:generate
npx jest --no-coverage 2>&1 | tail -5
```

Expected: 236 tests pass.

- [ ] **Step 3: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations
git commit --allow-empty -m "chore: start prisma-migrations worktree from master"
```

---

## Task 2: Replace Migration Directories with Baseline

**Files:**
- Delete: `apps/api/prisma/migrations/20260506000000_phase3_budget/`
- Delete: `apps/api/prisma/migrations/20260508000000_phase4_recommendations/`
- Delete: `apps/api/prisma/migrations/20260510000000_phase5a_scenarios/`
- Create: `apps/api/prisma/migrations/20260514000000_init/migration.sql`

- [ ] **Step 1: Delete the old migration directories**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations
rm -rf apps/api/prisma/migrations/20260506000000_phase3_budget
rm -rf apps/api/prisma/migrations/20260508000000_phase4_recommendations
rm -rf apps/api/prisma/migrations/20260510000000_phase5a_scenarios
```

- [ ] **Step 2: Create the baseline migration directory**

```bash
mkdir -p apps/api/prisma/migrations/20260514000000_init
```

- [ ] **Step 3: Generate baseline SQL from the current schema**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations/apps/api
pnpm exec prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > prisma/migrations/20260514000000_init/migration.sql
```

Expected: command exits 0. No output to stdout (SQL goes to the file).

- [ ] **Step 4: Verify the migration SQL is complete**

```bash
echo "CREATE TABLE count:" && grep -c "CREATE TABLE" prisma/migrations/20260514000000_init/migration.sql
echo "CREATE TYPE count:" && grep -c "CREATE TYPE" prisma/migrations/20260514000000_init/migration.sql
```

Expected:
- `CREATE TABLE count:` **13** (users, departments, locations, vendors, audit_log, hardware_assets, software_products, contracts, fiscal_year_settings, decision_history, scenarios, scenario_overrides, notification_log)
- `CREATE TYPE count:` **10** (Role, AssetType, LifecycleStatus, Criticality, FundingType, LicenseModel, SoftwareStatus, RecommendedAction, ContractType, ApprovalStatus, ScenarioType — Prisma may combine some, expect 8–11)

If `CREATE TABLE` count is below 13, the schema.prisma file may be out of date — run `pnpm db:generate` first and retry.

- [ ] **Step 5: Spot-check the SQL contains the notification_log table**

```bash
grep "notification_log" prisma/migrations/20260514000000_init/migration.sql
```

Expected: at least one line containing `"notification_log"` (the most recently added table).

- [ ] **Step 6: Run tests to confirm nothing broke**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: 236 tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations
git add apps/api/prisma/migrations/
git commit -m "feat: replace ad-hoc migration dirs with single baseline migration"
```

---

## Task 3: Update Dockerfile CMD + Final Checks

**Files:**
- Modify: `apps/api/Dockerfile` (line 61)

- [ ] **Step 1: Update the CMD in the Dockerfile**

Open `apps/api/Dockerfile`. Find the last line (the CMD):

```dockerfile
CMD ["sh", "-c", "node_modules/.bin/prisma db push --skip-generate --accept-data-loss && node dist/apps/api/src/main.js"]
```

Replace it with:

```dockerfile
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/apps/api/src/main.js"]
```

- [ ] **Step 2: Verify the Dockerfile change looks correct**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations
grep "CMD" apps/api/Dockerfile
```

Expected output:
```
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/apps/api/src/main.js"]
```

- [ ] **Step 3: Validate docker-compose syntax**

```bash
POSTGRES_USER=test POSTGRES_PASSWORD=test JWT_SECRET=test AUTH_SECRET=test_auth_secret_min_32 NEXTAUTH_URL=http://localhost:3000 docker compose config 2>&1 | grep -iE "error|Error" | head -5
```

Expected: empty output (no errors).

- [ ] **Step 4: Run final test suite**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: 236 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/prisma-migrations
git add apps/api/Dockerfile
git commit -m "feat: switch Dockerfile CMD from db push to migrate deploy"
```

---

## Deployment Note (On-Prem Server)

Since the production DB was created with `db push` and has no `_prisma_migrations` table, the new `migrate deploy` command would fail on the existing database (it would try to create tables that already exist).

Before deploying the new image, wipe and recreate the database on the server:

```bash
# On the production server
docker compose down -v          # stops containers AND deletes the pgdata volume
docker compose pull             # pull the new api image (after building + pushing)
docker compose up -d            # fresh start — migrate deploy runs baseline on empty DB
```

The `-v` flag deletes the named volume `pgdata`, wiping the database. `migrate deploy` then creates all tables cleanly from the baseline migration.
