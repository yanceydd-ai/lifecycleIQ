# Email Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send email digest notifications to a single configured recipient when time-sensitive LifecycleIQ alerts cross severity thresholds, deduplicating via a `notification_log` table so each (entity, alertType, severity) crossing fires at most once.

**Architecture:** A new `NotificationsModule` in the NestJS API contains two services: `NotificationsService` (nodemailer SMTP email sender) and `NotificationsCronService` (cron job that computes alerts, diffs against `notification_log`, and sends a digest for new crossings). The existing `AlertsService.getAlerts()` is reused unchanged. `PrismaModule` and `ConfigModule` are both `@Global()` so no extra imports needed.

**Tech Stack:** `@nestjs/schedule` (cron decorator), `nodemailer` (SMTP), Prisma `NotificationLog` model, NestJS `ConfigService`.

**Worktree:** `feature/email-alerts` from `master` at `/Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts`

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
| `apps/api/src/modules/alerts/alerts.module.ts` | Modify — add `exports: [AlertsService]` |
| `apps/api/src/app.module.ts` | Modify — add `ScheduleModule.forRoot()` and `NotificationsModule` |
| `docker-compose.yml` | Modify — add SMTP env vars to api service |
| `.env.example` | Modify — add SMTP + alert vars |

---

## Task 1: Worktree Setup + Install Packages

**Files:** none

- [ ] **Step 1: Create the worktree**

```bash
cd /Users/david/LifeCycleIQ_Claude
git worktree add .worktrees/email-alerts -b feature/email-alerts
```

- [ ] **Step 2: Install runtime and dev packages**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts
pnpm --filter=@lifecycleiq/api add nodemailer @nestjs/schedule
pnpm --filter=@lifecycleiq/api add -D @types/nodemailer
```

- [ ] **Step 3: Run baseline tests**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: all existing tests pass (226 tests).

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: install nodemailer and @nestjs/schedule"
```

---

## Task 2: Prisma Schema — NotificationLog

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Append NotificationLog model to schema.prisma**

Open `apps/api/prisma/schema.prisma` and add this model at the very end of the file:

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

- [ ] **Step 2: Regenerate the Prisma client**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts/apps/api
pnpm db:generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 3: Verify existing tests still pass**

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Expected: 226 tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts
git add apps/api/prisma/schema.prisma
git commit -m "feat: add NotificationLog model to Prisma schema"
```

---

## Task 3: NotificationsService (TDD)

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.service.spec.ts`
- Create: `apps/api/src/modules/notifications/notifications.service.ts`

- [ ] **Step 1: Create the test file**

Create `apps/api/src/modules/notifications/notifications.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

const mockAlert = (overrides: Record<string, unknown> = {}): any => ({
  id: 'software_product:sw-1:renewal_due',
  entityType: 'software_product',
  entityId: 'sw-1',
  entityName: 'Adobe Creative Cloud',
  alertType: 'renewal_due',
  severity: 'high',
  message: 'Adobe Creative Cloud renewal due in 45 days',
  dueDate: '2026-06-28',
  daysUntilDue: 45,
  ...overrides,
});

const smtpConfig: Record<string, string | number> = {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 587,
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'password',
  SMTP_FROM: 'alerts@example.com',
  ALERT_TO_EMAIL: 'admin@example.com',
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockSendMail: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => smtpConfig[key]) },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('skips send and resolves without error when SMTP_HOST is not configured', async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();
    const noSmtpService = module.get<NotificationsService>(NotificationsService);

    await expect(noSmtpService.sendAlertDigest([mockAlert()])).resolves.toBeUndefined();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('builds subject with correct singular and plural forms', () => {
    expect(service.buildSubject([mockAlert()])).toBe(
      '[LifecycleIQ] 1 alert requires attention',
    );
    expect(service.buildSubject([mockAlert(), mockAlert()])).toBe(
      '[LifecycleIQ] 2 alerts require attention',
    );
  });

  it('orders alerts critical before high before medium in HTML', () => {
    const alerts = [
      mockAlert({ severity: 'medium', message: 'Medium alert' }),
      mockAlert({ severity: 'critical', message: 'Critical alert' }),
      mockAlert({ severity: 'high', message: 'High alert' }),
    ];
    const html = service.buildHtml(alerts);
    expect(html.indexOf('Critical alert')).toBeLessThan(html.indexOf('High alert'));
    expect(html.indexOf('High alert')).toBeLessThan(html.indexOf('Medium alert'));
  });

  it('sends email with correct from and to addresses', async () => {
    await service.sendAlertDigest([mockAlert()]);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'alerts@example.com',
        to: 'admin@example.com',
      }),
    );
  });

  it('throws when sendMail rejects so the cron job can retry', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

    await expect(service.sendAlertDigest([mockAlert()])).rejects.toThrow(
      'SMTP connection refused',
    );
  });
});
```

- [ ] **Step 2: Run — confirm all 5 tests fail**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts/apps/api
npx jest --testPathPattern="notifications.service.spec" --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './notifications.service'`

- [ ] **Step 3: Create `notifications.service.ts`**

Create `apps/api/src/modules/notifications/notifications.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Alert, AlertSeverity } from '@lifecycleiq/shared';

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: '🔴 Critical (< 30 days)',
  high: '🟠 High (< 60 days)',
  medium: '🟡 Medium (< 90 days)',
  low: '⚪ Low (≤ 120 days)',
};

const SEVERITY_ORDER: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

@Injectable()
export class NotificationsService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {}

  private getTransporter(): nodemailer.Transporter | null {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT') ?? 587,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
    return this.transporter;
  }

  buildSubject(alerts: Alert[]): string {
    const n = alerts.length;
    return `[LifecycleIQ] ${n} alert${n === 1 ? '' : 's'} ${n === 1 ? 'requires' : 'require'} attention`;
  }

  buildHtml(alerts: Alert[]): string {
    let body = '<h2>LifecycleIQ — Alert Digest</h2>';
    for (const sev of SEVERITY_ORDER) {
      const group = alerts.filter(a => a.severity === sev);
      if (!group.length) continue;
      body += `<h3>${SEVERITY_LABEL[sev]}</h3><ul>`;
      for (const a of group) {
        body += `<li>${a.message}</li>`;
      }
      body += '</ul>';
    }
    body += '<p>Log in to LifecycleIQ to review and take action.</p>';
    return body;
  }

  buildText(alerts: Alert[]): string {
    let text = 'LifecycleIQ — Alert Digest\n' + '─'.repeat(30) + '\n\n';
    for (const sev of SEVERITY_ORDER) {
      const group = alerts.filter(a => a.severity === sev);
      if (!group.length) continue;
      text += `${SEVERITY_LABEL[sev]}\n`;
      for (const a of group) {
        text += `  • ${a.message}\n`;
      }
      text += '\n';
    }
    text += 'Log in to LifecycleIQ to review and take action.';
    return text;
  }

  async sendAlertDigest(alerts: Alert[]): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) return;

    // Propagate SMTP errors so the cron job skips logging and retries next run
    await transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: this.config.get<string>('ALERT_TO_EMAIL'),
      subject: this.buildSubject(alerts),
      html: this.buildHtml(alerts),
      text: this.buildText(alerts),
    });
  }
}
```

- [ ] **Step 4: Run — confirm all 5 tests pass**

```bash
npx jest --testPathPattern="notifications.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 5 passed`

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts
git add apps/api/src/modules/notifications/
git commit -m "feat: add NotificationsService with nodemailer SMTP (5 tests)"
```

---

## Task 4: NotificationsCronService (TDD)

**Files:**
- Create: `apps/api/src/modules/notifications/notifications-cron.service.spec.ts`
- Create: `apps/api/src/modules/notifications/notifications-cron.service.ts`

- [ ] **Step 1: Create the test file**

Create `apps/api/src/modules/notifications/notifications-cron.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsCronService } from './notifications-cron.service';
import { AlertsService } from '../alerts/alerts.service';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

const makeAlert = (overrides: Record<string, unknown> = {}): any => ({
  id: 'software_product:sw-1:renewal_due',
  entityType: 'software_product',
  entityId: 'sw-1',
  entityName: 'Adobe Creative Cloud',
  alertType: 'renewal_due',
  severity: 'high',
  message: 'Adobe Creative Cloud renewal due in 45 days',
  dueDate: '2026-06-28',
  daysUntilDue: 45,
  ...overrides,
});

describe('NotificationsCronService', () => {
  let service: NotificationsCronService;
  let alertsService: jest.Mocked<Pick<AlertsService, 'getAlerts'>>;
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'sendAlertDigest'>>;
  let prisma: { notificationLog: { findMany: jest.Mock; createMany: jest.Mock } };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      notificationLog: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsCronService,
        { provide: AlertsService, useValue: { getAlerts: jest.fn().mockResolvedValue([]) } },
        { provide: NotificationsService, useValue: { sendAlertDigest: jest.fn().mockResolvedValue(undefined) } },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('smtp.example.com') } },
      ],
    }).compile();

    service = module.get<NotificationsCronService>(NotificationsCronService);
    alertsService = module.get(AlertsService);
    notificationsService = module.get(NotificationsService);
  });

  it('filters out non-time-sensitive alert types and sends nothing', async () => {
    alertsService.getAlerts.mockResolvedValue([
      makeAlert({ alertType: 'warranty_expiring' }),
      makeAlert({ alertType: 'support_ending' }),
      makeAlert({ alertType: 'high_risk_unsupported' }),
    ]);

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).not.toHaveBeenCalled();
    expect(prisma.notificationLog.createMany).not.toHaveBeenCalled();
  });

  it('skips email when all time-sensitive alerts are already logged', async () => {
    const alert = makeAlert();
    alertsService.getAlerts.mockResolvedValue([alert]);
    prisma.notificationLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        entityType: alert.entityType,
        entityId: alert.entityId,
        alertType: alert.alertType,
        severity: alert.severity,
        sentAt: new Date(),
      },
    ]);

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).not.toHaveBeenCalled();
    expect(prisma.notificationLog.createMany).not.toHaveBeenCalled();
  });

  it('sends digest only for new crossings and logs them', async () => {
    const newAlert = makeAlert({ entityId: 'sw-2', id: 'software_product:sw-2:renewal_due' });
    const existingAlert = makeAlert();

    alertsService.getAlerts.mockResolvedValue([newAlert, existingAlert]);
    prisma.notificationLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        entityType: existingAlert.entityType,
        entityId: existingAlert.entityId,
        alertType: existingAlert.alertType,
        severity: existingAlert.severity,
        sentAt: new Date(),
      },
    ]);

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).toHaveBeenCalledWith([newAlert]);
    expect(prisma.notificationLog.createMany).toHaveBeenCalledWith({
      data: [
        {
          entityType: newAlert.entityType,
          entityId: newAlert.entityId,
          alertType: newAlert.alertType,
          severity: newAlert.severity,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('does not write log rows when sendAlertDigest throws', async () => {
    alertsService.getAlerts.mockResolvedValue([makeAlert()]);
    prisma.notificationLog.findMany.mockResolvedValue([]);
    notificationsService.sendAlertDigest.mockRejectedValue(new Error('SMTP error'));

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).toHaveBeenCalled();
    expect(prisma.notificationLog.createMany).not.toHaveBeenCalled();
  });

  it('handles auto_renewal_unreviewed alerts (null daysUntilDue)', async () => {
    const alert = makeAlert({
      alertType: 'auto_renewal_unreviewed',
      severity: 'critical',
      dueDate: null,
      daysUntilDue: null,
    });
    alertsService.getAlerts.mockResolvedValue([alert]);
    prisma.notificationLog.findMany.mockResolvedValue([]);

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).toHaveBeenCalledWith([alert]);
  });
});
```

- [ ] **Step 2: Run — confirm all 5 tests fail**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts/apps/api
npx jest --testPathPattern="notifications-cron.service.spec" --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './notifications-cron.service'`

- [ ] **Step 3: Create `notifications-cron.service.ts`**

Create `apps/api/src/modules/notifications/notifications-cron.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { NotificationsService } from './notifications.service';
import { Alert, AlertType } from '@lifecycleiq/shared';

const TIME_SENSITIVE_TYPES: AlertType[] = [
  'renewal_due',
  'cancellation_deadline',
  'auto_renewal_unreviewed',
];

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    private alertsService: AlertsService,
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Cron(process.env.ALERT_CRON_SCHEDULE ?? '0 8 * * *')
  async runAlertNotifications(): Promise<void> {
    // Skip entirely if SMTP not configured — avoids logging to notification_log
    // before email is enabled (which would suppress notifications after first config)
    if (!this.config.get<string>('SMTP_HOST')) {
      this.logger.debug('SMTP_HOST not set — skipping alert notifications');
      return;
    }

    try {
      const allAlerts = await this.alertsService.getAlerts();
      const timeSensitive = allAlerts.filter((a: Alert) =>
        TIME_SENSITIVE_TYPES.includes(a.alertType),
      );

      if (!timeSensitive.length) {
        this.logger.log('No time-sensitive alerts found');
        return;
      }

      const existing = await this.prisma.notificationLog.findMany({
        where: {
          OR: timeSensitive.map((a: Alert) => ({
            entityType: a.entityType,
            entityId: a.entityId,
            alertType: a.alertType,
            severity: a.severity,
          })),
        },
      });

      const loggedKeys = new Set(
        existing.map((e: any) => `${e.entityType}:${e.entityId}:${e.alertType}:${e.severity}`),
      );

      const newCrossings = timeSensitive.filter(
        (a: Alert) =>
          !loggedKeys.has(`${a.entityType}:${a.entityId}:${a.alertType}:${a.severity}`),
      );

      if (!newCrossings.length) {
        this.logger.log('No new alert crossings — skipping email');
        return;
      }

      this.logger.log(`Sending digest for ${newCrossings.length} new crossing(s)`);

      try {
        await this.notificationsService.sendAlertDigest(newCrossings);
      } catch (err) {
        this.logger.error('Failed to send alert digest — will retry on next run:', err);
        return;
      }

      await this.prisma.notificationLog.createMany({
        data: newCrossings.map((a: Alert) => ({
          entityType: a.entityType,
          entityId: a.entityId,
          alertType: a.alertType,
          severity: a.severity,
        })),
        skipDuplicates: true,
      });

      this.logger.log(`Logged ${newCrossings.length} notification(s)`);
    } catch (err) {
      this.logger.error('Alert notifications cron failed:', err);
    }
  }
}
```

- [ ] **Step 4: Run — confirm all 5 tests pass**

```bash
npx jest --testPathPattern="notifications-cron.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 5 passed`

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts
git add apps/api/src/modules/notifications/
git commit -m "feat: add NotificationsCronService with threshold-crossing diff logic (5 tests)"
```

---

## Task 5: Wire Modules + AppModule

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.module.ts`
- Modify: `apps/api/src/modules/alerts/alerts.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create `notifications.module.ts`**

Create `apps/api/src/modules/notifications/notifications.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsCronService } from './notifications-cron.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  providers: [NotificationsService, NotificationsCronService],
})
export class NotificationsModule {}
```

- [ ] **Step 2: Export AlertsService from `alerts.module.ts`**

Replace the entire contents of `apps/api/src/modules/alerts/alerts.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
```

- [ ] **Step 3: Update `app.module.ts`**

Replace the entire contents of `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { LocationsModule } from './modules/locations/locations.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { HardwareAssetsModule } from './modules/hardware-assets/hardware-assets.module';
import { SoftwareProductsModule } from './modules/software-products/software-products.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { BudgetModule } from './modules/budget/budget.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { ScenariosModule } from './modules/scenarios/scenarios.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AuditLogModule,
    UsersModule,
    DepartmentsModule,
    LocationsModule,
    VendorsModule,
    HardwareAssetsModule,
    SoftwareProductsModule,
    ContractsModule,
    BudgetModule,
    AlertsModule,
    RecommendationsModule,
    ScenariosModule,
    ReportsModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Run the full test suite**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: 236 tests pass (226 existing + 10 new).

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts
git add apps/api/src/modules/notifications/notifications.module.ts \
        apps/api/src/modules/alerts/alerts.module.ts \
        apps/api/src/app.module.ts
git commit -m "feat: wire NotificationsModule into AppModule with ScheduleModule"
```

---

## Task 6: Env Vars + Docker Compose + Final Checks

**Files:**
- Modify: `.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Append to `.env.example`**

Add these lines at the end of `.env.example`:

```
# Email alert notifications (leave SMTP_HOST blank to disable)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=lifecycleiq@yourdomain.com
ALERT_TO_EMAIL=itadmin@yourdomain.com
ALERT_CRON_SCHEDULE=0 8 * * *
```

- [ ] **Step 2: Add SMTP vars to `docker-compose.yml`**

In the `api` service `environment` block (after `PORT: 3001`), add:

```yaml
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      SMTP_FROM: ${SMTP_FROM:-}
      ALERT_TO_EMAIL: ${ALERT_TO_EMAIL:-}
      ALERT_CRON_SCHEDULE: ${ALERT_CRON_SCHEDULE:-0 8 * * *}
```

- [ ] **Step 3: Validate docker-compose syntax**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts
POSTGRES_USER=test POSTGRES_PASSWORD=test JWT_SECRET=test AUTH_SECRET=test_auth_secret_min_32 NEXTAUTH_URL=http://localhost:3000 docker compose config 2>&1 | grep -iE "error|Error" | head -5
```

Expected: empty output (no errors).

- [ ] **Step 4: Run full test suite one final time**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: 236 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/email-alerts
git add .env.example docker-compose.yml
git commit -m "feat: add SMTP env vars to .env.example and docker-compose.yml"
```
