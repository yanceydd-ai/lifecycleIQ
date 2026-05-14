# Email Alerts — Design Spec

**Goal:** Send email notifications to a single configured recipient when time-sensitive alerts cross severity thresholds, so the IT admin is informed without having to log in to LifecycleIQ.

---

## Overview

The existing `computeAlerts()` function already identifies expiring contracts, renewals, and cancellation deadlines. This feature adds a daily cron job that re-uses that logic, compares results against a `notification_log` table, and sends a digest email for any new threshold crossings.

**Alert types notified:** `renewal_due`, `cancellation_deadline`, `auto_renewal_unreviewed`

**Severity levels tracked:** `medium` (<90 days), `high` (<60 days), `critical` (<30 days)

**Rule:** One email per severity level per item. A contract generates up to 3 emails as it approaches its deadline (once at medium, once at high, once at critical). Each email is a grouped digest — all new crossings in a single run produce one email, not one per alert.

**What does NOT change:** `AlertsService`, `AlertsModule`, `computeAlerts()`, all existing API endpoints, JWT guards, all other modules.

---

## Part 1: Database Schema

New table in `apps/api/prisma/schema.prisma`:

```prisma
model NotificationLog {
  id          String   @id @default(uuid())
  entityType  String   @map("entity_type")
  entityId    String   @map("entity_id")
  alertType   String   @map("alert_type")
  severity    String
  sentAt      DateTime @default(now()) @map("sent_at")

  @@unique([entityType, entityId, alertType, severity])
  @@map("notification_log")
}
```

The unique constraint on `(entityType, entityId, alertType, severity)` is the deduplication key. Prisma's `createMany` with `skipDuplicates: true` handles idempotency — a crossing already logged is silently skipped.

No migration files required. The existing `CMD` in `apps/api/Dockerfile` already runs `prisma db push` on startup.

---

## Part 2: New `NotificationsModule`

**Location:** `apps/api/src/modules/notifications/`

### Files

| File | Responsibility |
|------|---------------|
| `notifications.module.ts` | NestJS module — imports PrismaModule, registers both services |
| `notifications.service.ts` | Sends email via nodemailer; renders HTML + plain-text digest |
| `notifications-cron.service.ts` | Scheduled job — computes alerts, diffs against log, triggers email |
| `notifications.service.spec.ts` | Unit tests for email rendering and send logic |
| `notifications-cron.service.spec.ts` | Unit tests for cron diff logic |

### `NotificationsService`

Injected dependencies: `ConfigService`, `PrismaService`

```typescript
// Key method signature
async sendAlertDigest(alerts: Alert[]): Promise<void>
```

- Creates a `nodemailer` transporter from env vars on first call (lazy init)
- If `SMTP_HOST` is not set, logs a warning and returns without throwing
- Groups alerts by severity (critical → high → medium)
- Sends one multipart (HTML + plain text) email
- Subject: `[LifecycleIQ] {N} alert{s} require attention`

### `NotificationsCronService`

Injected dependencies: `AlertsService`, `NotificationsService`, `PrismaService`, `ConfigService`

```typescript
@Cron(process.env.ALERT_CRON_SCHEDULE ?? '0 8 * * *')
async runAlertNotifications(): Promise<void>
```

**Logic:**
1. Call `alertsService.getAlerts({})` to get all active alerts (implementer: verify the exact public method name on `AlertsService`)
2. Filter to `alertType` values: `renewal_due`, `cancellation_deadline`, `auto_renewal_unreviewed`
3. For each alert, query `prisma.notificationLog.findMany` to find which `(entityType, entityId, alertType, severity)` tuples are already logged
4. Collect alerts whose tuple is **not** in the log — these are the new crossings
5. If no new crossings → exit (no email sent)
6. Call `notificationsService.sendAlertDigest(newCrossings)` — if this throws, log the error and exit without writing log rows (so the next cron run retries)
7. On successful send → insert new rows into `notification_log` via `prisma.notificationLog.createMany({ skipDuplicates: true })`

### `AppModule` changes

```typescript
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './modules/notifications/notifications.module';

// In imports array:
ScheduleModule.forRoot(),
NotificationsModule,
```

---

## Part 3: Email Format

**Subject:** `[LifecycleIQ] 3 alerts require attention`

**HTML body** (groups by severity, critical first):

```
LifecycleIQ — Alert Digest
──────────────────────────

🔴 Critical (< 30 days)
  • Cisco Firewall Maintenance — renewal due in 12 days (Contract)

🟠 High (< 60 days)
  • Microsoft 365 E3 — cancellation deadline in 45 days (Software)

🟡 Medium (< 90 days)
  • Dell PowerEdge R740 Warranty — renewal due in 78 days (Hardware)

──────────────────────────
Log in to LifecycleIQ to review and take action.
```

Plain-text version mirrors the HTML content without markup.

---

## Part 4: Environment Variables

### New vars (API container)

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | — (required to enable) |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP auth username | — |
| `SMTP_PASS` | SMTP auth password | — |
| `SMTP_FROM` | From address shown in email | — |
| `ALERT_TO_EMAIL` | Single recipient address | — |
| `ALERT_CRON_SCHEDULE` | Cron expression for job timing | `0 8 * * *` |

If `SMTP_HOST` is unset, the cron job runs but skips sending — no error, no crash. Existing deployments without email configured are unaffected.

### `.env.example` additions

```
# Email alerts (leave SMTP_HOST blank to disable)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=lifecycleiq@yourdomain.com
ALERT_TO_EMAIL=itadmin@yourdomain.com
ALERT_CRON_SCHEDULE=0 8 * * *
```

### `docker-compose.yml` additions (api service environment)

```yaml
SMTP_HOST: ${SMTP_HOST:-}
SMTP_PORT: ${SMTP_PORT:-587}
SMTP_USER: ${SMTP_USER:-}
SMTP_PASS: ${SMTP_PASS:-}
SMTP_FROM: ${SMTP_FROM:-}
ALERT_TO_EMAIL: ${ALERT_TO_EMAIL:-}
ALERT_CRON_SCHEDULE: ${ALERT_CRON_SCHEDULE:-0 8 * * *}
```

---

## Part 5: Tests

### `notifications.service.spec.ts`

- Does not send real email — mocks nodemailer `createTransport` and `sendMail`
- **Skips send when `SMTP_HOST` is not configured**
- **Renders subject with correct count** (`[LifecycleIQ] 2 alerts require attention`)
- **Groups alerts by severity** (critical before high before medium in HTML output)
- **Handles `sendMail` rejection** without throwing (logs error)

### `notifications-cron.service.spec.ts`

- Mocks `alertsService.getAlerts`, `prisma.notificationLog.createMany`, `notificationsService.sendAlertDigest`
- **Filters out non-time-sensitive alert types** (warranty_expiring, support_ending, high_risk_unsupported)
- **Does not call sendAlertDigest when no new crossings** (all rows already in log)
- **Calls sendAlertDigest with only new crossings** when some are new
- **Does not write log rows when sendAlertDigest throws** (retry on next run)

---

## File Map

| File | Action |
|------|--------|
| `apps/api/prisma/schema.prisma` | Modify — add `NotificationLog` model |
| `apps/api/src/modules/notifications/notifications.module.ts` | Create |
| `apps/api/src/modules/notifications/notifications.service.ts` | Create |
| `apps/api/src/modules/notifications/notifications-cron.service.ts` | Create |
| `apps/api/src/modules/notifications/notifications.service.spec.ts` | Create |
| `apps/api/src/modules/notifications/notifications-cron.service.spec.ts` | Create |
| `apps/api/src/app.module.ts` | Modify — add ScheduleModule + NotificationsModule |
| `docker-compose.yml` | Modify — add SMTP env vars to api service |
| `.env.example` | Modify — add SMTP + alert vars |

---

## What Does NOT Change

- `AlertsService` / `AlertsModule` — unchanged
- `computeAlerts()` in `@lifecycleiq/shared` — unchanged
- `GET /api/v1/alerts` endpoint — unchanged
- All JWT guards, roles, server actions — unchanged
- User table schema — unchanged
- Frontend — unchanged
