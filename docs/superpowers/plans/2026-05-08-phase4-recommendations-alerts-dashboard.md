# Phase 4 — Recommendations, Alerts, and Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add computed alerts, a deterministic recommendation engine with override/decision-history, and rebuilt Dashboard and Decisions pages on top of the existing LifecycleIQ monorepo.

**Architecture:** Two new NestJS modules (AlertsModule, RecommendationsModule) each expose pure exported functions (`computeAlerts`, `computeRecommendation`) that are fully unit-tested without Prisma, plus thin service wrappers for DB access and a controller per module. The Next.js Dashboard page aggregates forecast + alerts + recommendations in parallel server-side fetches; the Decisions page presents a tabbed recommendations table with an inline override dialog.

**Tech Stack:** NestJS, Prisma (PostgreSQL/Supabase), Next.js 14 App Router, TypeScript, Tailwind CSS, `@lifecycleiq/shared` types, existing `computeHardwareFields` from `hardware-assets.service.ts`, existing `BudgetClient` chart component from Phase 3.

> **Branch note:** Phase 3 is on `feature/phase-3` (PR open, not yet merged). Create this worktree from `feature/phase-3`, not `master`.

---

## File Map

| File | Action |
|---|---|
| `apps/api/prisma/schema.prisma` | Modify — add `retire`/`defer` to `RecommendedAction` enum; add `recommendedAction` to `HardwareAsset` and `Contract`; add `DecisionHistory` model |
| `apps/api/prisma/migrations/20260508000000_phase4_recommendations/migration.sql` | Create |
| `apps/api/src/modules/alerts/alerts.service.ts` | Create |
| `apps/api/src/modules/alerts/alerts.service.spec.ts` | Create |
| `apps/api/src/modules/alerts/alerts.controller.ts` | Create |
| `apps/api/src/modules/alerts/alerts.module.ts` | Create |
| `apps/api/src/modules/recommendations/recommendations.service.ts` | Create |
| `apps/api/src/modules/recommendations/recommendations.service.spec.ts` | Create |
| `apps/api/src/modules/recommendations/recommendations.controller.ts` | Create |
| `apps/api/src/modules/recommendations/recommendations.module.ts` | Create |
| `apps/api/src/modules/recommendations/dto/update-recommendation.dto.ts` | Create |
| `apps/api/src/app.module.ts` | Modify — register AlertsModule, RecommendationsModule |
| `packages/shared/src/types/alert.ts` | Create |
| `packages/shared/src/types/recommendation.ts` | Create |
| `packages/shared/src/index.ts` | Modify — export new types |
| `apps/web/lib/actions/alerts.ts` | Create |
| `apps/web/lib/actions/recommendations.ts` | Create |
| `apps/web/app/(protected)/dashboard/page.tsx` | Rewrite |
| `apps/web/app/(protected)/dashboard/client.tsx` | Create |
| `apps/web/app/(protected)/decisions/page.tsx` | Rewrite |
| `apps/web/app/(protected)/decisions/client.tsx` | Create |

---

## Task 1: Worktree Setup

**Files:** none created — git setup only

- [ ] **Step 1: Create the worktree**

```bash
cd /Users/david/LifeCycleIQ_Claude
git worktree add .worktrees/phase-4 -b feature/phase-4 feature/phase-3
cd .worktrees/phase-4
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Run baseline tests to confirm clean start**

```bash
cd apps/api && npx jest --passWithNoTests 2>&1 | tail -5
```

Expected: all existing tests pass (132+), 0 failures. If tests fail, stop and investigate before continuing.

- [ ] **Step 4: Commit baseline marker**

```bash
git commit --allow-empty -m "chore: start Phase 4 worktree from feature/phase-3"
```

---

## Task 2: Prisma Schema + Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260508000000_phase4_recommendations/migration.sql`

- [ ] **Step 1: Add `retire` and `defer` to the `RecommendedAction` enum in schema.prisma**

Find the existing `RecommendedAction` enum (around line 52) and replace it:

```prisma
enum RecommendedAction {
  renew_as_is
  renew_with_reduction
  expand
  renegotiate
  replace
  retire
  defer
  consolidate
  terminate
  monitor
  escalate
}
```

- [ ] **Step 2: Add `recommendedAction` field to `HardwareAsset` model**

In the `HardwareAsset` model, add after the `annualMaintenanceCost` line:

```prisma
  recommendedAction       RecommendedAction? @map("recommended_action")
```

- [ ] **Step 3: Add `recommendedAction` field to `Contract` model**

In the `Contract` model, add after the `notes` field (before `createdAt`):

```prisma
  recommendedAction        RecommendedAction? @map("recommended_action")
```

- [ ] **Step 4: Add the `DecisionHistory` model at the end of schema.prisma**

```prisma
model DecisionHistory {
  id             String   @id @default(uuid())
  entityType     String   @map("entity_type")
  entityId       String   @map("entity_id")
  previousAction String?  @map("previous_action")
  newAction      String   @map("new_action")
  rationale      String
  userId         String   @map("user_id")
  createdAt      DateTime @default(now()) @map("created_at")

  @@map("decision_history")
}
```

- [ ] **Step 5: Create the migration SQL file**

Create directory and file:
`apps/api/prisma/migrations/20260508000000_phase4_recommendations/migration.sql`

```sql
-- Add retire and defer to RecommendedAction enum
ALTER TYPE "RecommendedAction" ADD VALUE IF NOT EXISTS 'retire';
ALTER TYPE "RecommendedAction" ADD VALUE IF NOT EXISTS 'defer';

-- AlterTable: hardware_assets
ALTER TABLE "hardware_assets" ADD COLUMN "recommended_action" TEXT;

-- AlterTable: contracts
ALTER TABLE "contracts" ADD COLUMN "recommended_action" TEXT;

-- CreateTable: decision_history
CREATE TABLE "decision_history" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "previous_action" TEXT,
    "new_action" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "decision_history_pkey" PRIMARY KEY ("id")
);
```

- [ ] **Step 6: Generate the Prisma client**

```bash
cd apps/api && npx prisma generate
```

Expected output: `✔ Generated Prisma Client`

- [ ] **Step 7: Apply the migration to Supabase**

```bash
npx prisma migrate deploy
```

Or apply via Supabase MCP if `migrate deploy` fails in this environment.

- [ ] **Step 8: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add DecisionHistory model, recommendedAction to hardware/contracts, retire/defer enum values"
```

---

## Task 3: Shared Types

**Files:**
- Create: `packages/shared/src/types/alert.ts`
- Create: `packages/shared/src/types/recommendation.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/src/types/alert.ts`**

```typescript
export interface Alert {
  id: string;
  entityType: 'hardware_asset' | 'software_product' | 'contract';
  entityId: string;
  entityName: string;
  alertType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  dueDate: string | null;
  daysUntilDue: number | null;
}
```

- [ ] **Step 2: Create `packages/shared/src/types/recommendation.ts`**

```typescript
export interface Recommendation {
  entityType: 'hardware_asset' | 'software_product' | 'contract';
  entityId: string;
  entityName: string;
  score: number;
  classification: string;
  recommendedAction: string;
  explanation: string;
  isOverridden: boolean;
  overriddenAction: string | null;
}

export interface DecisionHistory {
  id: string;
  entityType: string;
  entityId: string;
  previousAction: string | null;
  newAction: string;
  rationale: string;
  userId: string;
  createdAt: string;
}

export interface UpdateRecommendationInput {
  newAction: string;
  rationale: string;
}
```

- [ ] **Step 3: Export from `packages/shared/src/index.ts`**

Add two lines at the end:

```typescript
export * from './types/alert';
export * from './types/recommendation';
```

- [ ] **Step 4: Build shared package to confirm no type errors**

```bash
cd packages/shared && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: add Alert, Recommendation, DecisionHistory shared types"
```

---

## Task 4: AlertsModule (TDD)

**Files:**
- Create: `apps/api/src/modules/alerts/alerts.service.ts`
- Create: `apps/api/src/modules/alerts/alerts.service.spec.ts`
- Create: `apps/api/src/modules/alerts/alerts.controller.ts`
- Create: `apps/api/src/modules/alerts/alerts.module.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/alerts/alerts.service.spec.ts`:

```typescript
import { computeAlerts } from './alerts.service';

const TODAY = new Date('2026-05-08');

function daysOut(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d;
}

function mockAsset(overrides: any = {}): any {
  return {
    id: 'hw-1', assetTag: 'HW-001', manufacturer: 'Dell', model: 'XPS 15',
    assetType: 'laptop', lifecycleStatus: 'active', criticality: 'medium',
    warrantyEndDate: null, supportEndDate: null,
    ...overrides,
  };
}

function mockSoftware(overrides: any = {}): any {
  return {
    id: 'sw-1', name: 'Microsoft 365', status: 'active',
    renewalDate: null, noticePeriodDays: null, autoRenewal: false, recommendedAction: null,
    ...overrides,
  };
}

function mockContract(overrides: any = {}): any {
  return {
    id: 'ct-1', name: 'Dell Support',
    renewalDate: null, noticePeriodDays: null, autoRenewal: false, recommendedAction: null,
    ...overrides,
  };
}

describe('computeAlerts', () => {
  it('returns empty array when no entities', () => {
    expect(computeAlerts([], [], [], TODAY)).toEqual([]);
  });

  it('produces warranty_expiring alert when warrantyEndDate within 120 days', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(45) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.some(a => a.alertType === 'warranty_expiring')).toBe(true);
  });

  it('produces no warranty alert when warrantyEndDate is more than 120 days out', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(130) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.some(a => a.alertType === 'warranty_expiring')).toBe(false);
  });

  it('sets severity=critical when warrantyEndDate within 29 days', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(20) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    const alert = alerts.find(a => a.alertType === 'warranty_expiring')!;
    expect(alert.severity).toBe('critical');
  });

  it('sets severity=high when warrantyEndDate is 30-59 days out', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(40) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    const alert = alerts.find(a => a.alertType === 'warranty_expiring')!;
    expect(alert.severity).toBe('high');
  });

  it('produces high_risk_unsupported when supportEndDate past and mission_critical', () => {
    const asset = mockAsset({ supportEndDate: daysOut(-10), criticality: 'mission_critical' });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.some(a => a.alertType === 'high_risk_unsupported')).toBe(true);
    expect(alerts.find(a => a.alertType === 'high_risk_unsupported')!.severity).toBe('critical');
  });

  it('does not produce high_risk_unsupported when criticality is high (not mission_critical)', () => {
    const asset = mockAsset({ supportEndDate: daysOut(-10), criticality: 'high' });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.some(a => a.alertType === 'high_risk_unsupported')).toBe(false);
  });

  it('excludes retired assets from all alert checks', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(10), lifecycleStatus: 'retired' });
    expect(computeAlerts([asset], [], [], TODAY)).toHaveLength(0);
  });

  it('excludes disposed assets from all alert checks', () => {
    const asset = mockAsset({ supportEndDate: daysOut(-5), criticality: 'mission_critical', lifecycleStatus: 'disposed' });
    expect(computeAlerts([asset], [], [], TODAY)).toHaveLength(0);
  });

  it('computes cancellation_deadline from renewalDate minus noticePeriodDays for software', () => {
    // renewal in 40 days, notice 30 days → deadline in 10 days
    const sw = mockSoftware({ renewalDate: daysOut(40), noticePeriodDays: 30 });
    const alerts = computeAlerts([], [sw], [], TODAY);
    const alert = alerts.find(a => a.alertType === 'cancellation_deadline')!;
    expect(alert).toBeDefined();
    expect(alert.daysUntilDue).toBe(10);
    expect(alert.severity).toBe('critical');
  });

  it('produces auto_renewal_unreviewed when autoRenewal=true and no recommendedAction', () => {
    const sw = mockSoftware({ autoRenewal: true, recommendedAction: null });
    const alerts = computeAlerts([], [sw], [], TODAY);
    expect(alerts.some(a => a.alertType === 'auto_renewal_unreviewed')).toBe(true);
    expect(alerts.find(a => a.alertType === 'auto_renewal_unreviewed')!.severity).toBe('critical');
  });

  it('does not produce auto_renewal_unreviewed when recommendedAction is set', () => {
    const sw = mockSoftware({ autoRenewal: true, recommendedAction: 'renew_as_is' });
    const alerts = computeAlerts([], [sw], [], TODAY);
    expect(alerts.some(a => a.alertType === 'auto_renewal_unreviewed')).toBe(false);
  });

  it('excludes terminated software from all alert checks', () => {
    const sw = mockSoftware({ status: 'terminated', renewalDate: daysOut(10), autoRenewal: true });
    expect(computeAlerts([], [sw], [], TODAY)).toHaveLength(0);
  });

  it('produces renewal_due for contract within 60 days with severity=high', () => {
    const contract = mockContract({ renewalDate: daysOut(55) });
    const alerts = computeAlerts([], [], [contract], TODAY);
    const alert = alerts.find(a => a.alertType === 'renewal_due')!;
    expect(alert).toBeDefined();
    expect(alert.severity).toBe('high');
  });

  it('alert id is deterministic for same entity and alert type', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(10) });
    const r1 = computeAlerts([asset], [], [], TODAY);
    const r2 = computeAlerts([asset], [], [], TODAY);
    expect(r1[0].id).toBe(r2[0].id);
  });

  it('sorts critical alerts before high before medium before low', () => {
    const assetCritical = mockAsset({ id: 'hw-a', warrantyEndDate: daysOut(5) });
    const assetHigh = mockAsset({ id: 'hw-b', warrantyEndDate: daysOut(45) });
    const alerts = computeAlerts([assetHigh, assetCritical], [], [], TODAY);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[1].severity).toBe('high');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api && npx jest alerts.service.spec --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `computeAlerts` not found.

- [ ] **Step 3: Create `apps/api/src/modules/alerts/alerts.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { HardwareAsset, SoftwareProduct, Contract } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Alert } from '@lifecycleiq/shared';

function diffDays(target: Date, from: Date): number {
  return Math.ceil((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function severity(days: number): 'critical' | 'high' | 'medium' | 'low' {
  if (days < 30) return 'critical';
  if (days < 60) return 'high';
  if (days < 90) return 'medium';
  return 'low';
}

const EXCLUDED_HW = ['retired', 'disposed'];
const EXCLUDED_SW = ['terminated', 'replaced'];
const WINDOW = 120;

export function computeAlerts(
  assets: HardwareAsset[],
  software: SoftwareProduct[],
  contracts: Contract[],
  today: Date,
): Alert[] {
  const alerts: Alert[] = [];

  for (const asset of assets) {
    if (EXCLUDED_HW.includes(asset.lifecycleStatus)) continue;
    const name = [asset.manufacturer, asset.model].filter(Boolean).join(' ') || asset.assetTag || asset.id;

    if (asset.warrantyEndDate) {
      const days = diffDays(asset.warrantyEndDate, today);
      if (days >= 0 && days <= WINDOW) {
        alerts.push({
          id: `hardware_asset:${asset.id}:warranty_expiring`,
          entityType: 'hardware_asset',
          entityId: asset.id,
          entityName: name,
          alertType: 'warranty_expiring',
          severity: severity(days),
          message: `${name} warranty expires in ${days} day${days === 1 ? '' : 's'}`,
          dueDate: asset.warrantyEndDate.toISOString().split('T')[0],
          daysUntilDue: days,
        });
      }
    }

    if (asset.supportEndDate) {
      const days = diffDays(asset.supportEndDate, today);
      if (days >= 0 && days <= WINDOW) {
        alerts.push({
          id: `hardware_asset:${asset.id}:support_ending`,
          entityType: 'hardware_asset',
          entityId: asset.id,
          entityName: name,
          alertType: 'support_ending',
          severity: severity(days),
          message: `${name} support ends in ${days} day${days === 1 ? '' : 's'}`,
          dueDate: asset.supportEndDate.toISOString().split('T')[0],
          daysUntilDue: days,
        });
      } else if (days < 0 && asset.criticality === 'mission_critical') {
        alerts.push({
          id: `hardware_asset:${asset.id}:high_risk_unsupported`,
          entityType: 'hardware_asset',
          entityId: asset.id,
          entityName: name,
          alertType: 'high_risk_unsupported',
          severity: 'critical',
          message: `${name} is unsupported and mission-critical`,
          dueDate: null,
          daysUntilDue: null,
        });
      }
    }
  }

  for (const sw of software) {
    if (EXCLUDED_SW.includes(sw.status)) continue;
    const name = sw.name;

    if (sw.renewalDate) {
      const days = diffDays(sw.renewalDate, today);
      if (days >= 0 && days <= WINDOW) {
        alerts.push({
          id: `software_product:${sw.id}:renewal_due`,
          entityType: 'software_product',
          entityId: sw.id,
          entityName: name,
          alertType: 'renewal_due',
          severity: severity(days),
          message: `${name} renewal due in ${days} day${days === 1 ? '' : 's'}`,
          dueDate: sw.renewalDate.toISOString().split('T')[0],
          daysUntilDue: days,
        });
      }

      if (sw.noticePeriodDays) {
        const deadline = new Date(sw.renewalDate);
        deadline.setDate(deadline.getDate() - sw.noticePeriodDays);
        const cancelDays = diffDays(deadline, today);
        if (cancelDays >= 0 && cancelDays <= WINDOW) {
          alerts.push({
            id: `software_product:${sw.id}:cancellation_deadline`,
            entityType: 'software_product',
            entityId: sw.id,
            entityName: name,
            alertType: 'cancellation_deadline',
            severity: severity(cancelDays),
            message: `${name} cancellation deadline in ${cancelDays} day${cancelDays === 1 ? '' : 's'}`,
            dueDate: deadline.toISOString().split('T')[0],
            daysUntilDue: cancelDays,
          });
        }
      }
    }

    if (sw.autoRenewal && !sw.recommendedAction) {
      alerts.push({
        id: `software_product:${sw.id}:auto_renewal_unreviewed`,
        entityType: 'software_product',
        entityId: sw.id,
        entityName: name,
        alertType: 'auto_renewal_unreviewed',
        severity: 'critical',
        message: `${name} has auto-renewal enabled with no decision on record`,
        dueDate: null,
        daysUntilDue: null,
      });
    }
  }

  for (const contract of contracts) {
    const name = contract.name;

    if (contract.renewalDate) {
      const days = diffDays(contract.renewalDate, today);
      if (days >= 0 && days <= WINDOW) {
        alerts.push({
          id: `contract:${contract.id}:renewal_due`,
          entityType: 'contract',
          entityId: contract.id,
          entityName: name,
          alertType: 'renewal_due',
          severity: severity(days),
          message: `${name} renewal due in ${days} day${days === 1 ? '' : 's'}`,
          dueDate: contract.renewalDate.toISOString().split('T')[0],
          daysUntilDue: days,
        });
      }

      if (contract.noticePeriodDays) {
        const deadline = new Date(contract.renewalDate);
        deadline.setDate(deadline.getDate() - contract.noticePeriodDays);
        const cancelDays = diffDays(deadline, today);
        if (cancelDays >= 0 && cancelDays <= WINDOW) {
          alerts.push({
            id: `contract:${contract.id}:cancellation_deadline`,
            entityType: 'contract',
            entityId: contract.id,
            entityName: name,
            alertType: 'cancellation_deadline',
            severity: severity(cancelDays),
            message: `${name} cancellation deadline in ${cancelDays} day${cancelDays === 1 ? '' : 's'}`,
            dueDate: deadline.toISOString().split('T')[0],
            daysUntilDue: cancelDays,
          });
        }
      }
    }

    if (contract.autoRenewal && !(contract as any).recommendedAction) {
      alerts.push({
        id: `contract:${contract.id}:auto_renewal_unreviewed`,
        entityType: 'contract',
        entityId: contract.id,
        entityName: name,
        alertType: 'auto_renewal_unreviewed',
        severity: 'critical',
        message: `${name} has auto-renewal enabled with no decision on record`,
        dueDate: null,
        daysUntilDue: null,
      });
    }
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => {
    const sd = order[a.severity] - order[b.severity];
    if (sd !== 0) return sd;
    if (a.daysUntilDue !== null && b.daysUntilDue !== null) return a.daysUntilDue - b.daysUntilDue;
    return 0;
  });

  return alerts;
}

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async getAlerts(params?: { entityType?: string; severity?: string; days?: number }): Promise<Alert[]> {
    const [assets, software, contracts] = await Promise.all([
      this.prisma.hardwareAsset.findMany(),
      this.prisma.softwareProduct.findMany(),
      this.prisma.contract.findMany(),
    ]);

    let alerts = computeAlerts(assets, software, contracts, new Date());

    if (params?.entityType) alerts = alerts.filter(a => a.entityType === params.entityType);
    if (params?.severity) alerts = alerts.filter(a => a.severity === params.severity);
    if (params?.days !== undefined) {
      alerts = alerts.filter(a => a.daysUntilDue === null || a.daysUntilDue <= params.days!);
    }

    return alerts;
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npx jest alerts.service.spec --no-coverage 2>&1 | tail -10
```

Expected: 14 tests passing, 0 failures.

- [ ] **Step 5: Create `apps/api/src/modules/alerts/alerts.controller.ts`**

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private service: AlertsService) {}

  @Get()
  getAlerts(
    @Query('entityType') entityType?: string,
    @Query('severity') severity?: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : undefined;
    return this.service.getAlerts({
      entityType,
      severity,
      days: daysNum !== undefined && !isNaN(daysNum) ? daysNum : undefined,
    });
  }
}
```

- [ ] **Step 6: Create `apps/api/src/modules/alerts/alerts.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/alerts/
git commit -m "feat: add AlertsModule with computeAlerts TDD (14 tests)"
```

---

## Task 5: RecommendationsModule (TDD)

**Files:**
- Create: `apps/api/src/modules/recommendations/recommendations.service.ts`
- Create: `apps/api/src/modules/recommendations/recommendations.service.spec.ts`
- Create: `apps/api/src/modules/recommendations/recommendations.controller.ts`
- Create: `apps/api/src/modules/recommendations/recommendations.module.ts`
- Create: `apps/api/src/modules/recommendations/dto/update-recommendation.dto.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/recommendations/recommendations.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService, computeRecommendation } from './recommendations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const TODAY = new Date('2026-05-08');
const CURRENT_YEAR = 2026;

function dec(n: number) { return { toNumber: () => n } as any; }

function mockHardware(overrides: any = {}): any {
  return {
    id: 'hw-1', assetTag: 'HW-001', manufacturer: 'Dell', model: 'XPS 15',
    assetType: 'laptop', lifecycleStatus: 'active', criticality: 'medium',
    purchaseDate: new Date('2021-01-01'), usefulLifeYears: 5,
    purchaseCost: dec(5000), replacementCost: null, replacementYearOverride: null,
    replacementYear: CURRENT_YEAR + 3,
    warrantyExpired: false, unsupported: false, highRisk: false,
    warrantyEndDate: null, supportEndDate: null,
    annualMaintenanceCost: null, recommendedAction: null,
    fundingType: 'capex', locationId: null, departmentId: null, vendorId: null,
    assignedUserId: null, businessOwner: null, technicalOwner: null, notes: null,
    serialNumber: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

function mockSoftware(overrides: any = {}): any {
  return {
    id: 'sw-1', name: 'Microsoft 365', status: 'active',
    renewalDate: null, noticePeriodDays: null, autoRenewal: false, recommendedAction: null,
    qtyPurchased: null, qtyActivelyUsed: null, annualCost: dec(5000),
    riskIfNotRenewed: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

function mockContract(overrides: any = {}): any {
  return {
    id: 'ct-1', name: 'Dell Support',
    renewalDate: null, endDate: null, autoRenewal: false, recommendedAction: null,
    approvalStatus: 'approved', annualCost: dec(5000),
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe('computeRecommendation — hardware', () => {
  it('returns maximum score=100 for mission_critical + past replacement + unsupported + due_for_replacement + high cost', () => {
    const asset = mockHardware({
      criticality: 'mission_critical',
      replacementYear: CURRENT_YEAR - 1,
      supportEndDate: new Date('2025-01-01'),
      lifecycleStatus: 'due_for_replacement',
      replacementCost: dec(15000),
    });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.score).toBe(100);
    expect(result.recommendedAction).toBe('replace');
  });

  it('recommendedAction=replace when replacementYear <= currentYear', () => {
    const asset = mockHardware({ replacementYear: CURRENT_YEAR });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.recommendedAction).toBe('replace');
  });

  it('recommendedAction=replace when lifecycleStatus=due_for_replacement', () => {
    const asset = mockHardware({ lifecycleStatus: 'due_for_replacement' });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.recommendedAction).toBe('replace');
  });

  it('recommendedAction=monitor when replacement far out with no risk factors', () => {
    const asset = mockHardware({ replacementYear: CURRENT_YEAR + 4, criticality: 'low' });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.recommendedAction).toBe('monitor');
  });

  it('security_risk=100 when supportEndDate is in the past', () => {
    const assetWithSupport = mockHardware({ supportEndDate: new Date('2025-01-01'), criticality: 'mission_critical', replacementYear: CURRENT_YEAR - 1, lifecycleStatus: 'due_for_replacement', replacementCost: dec(15000) });
    const assetWithout = mockHardware({ criticality: 'mission_critical', replacementYear: CURRENT_YEAR - 1, lifecycleStatus: 'due_for_replacement', replacementCost: dec(15000) });
    const withSupport = computeRecommendation('hardware_asset', assetWithSupport, TODAY);
    const without = computeRecommendation('hardware_asset', assetWithout, TODAY);
    expect(withSupport.score).toBeGreaterThan(without.score);
  });

  it('generates non-empty explanation string', () => {
    const asset = mockHardware();
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.explanation.length).toBeGreaterThan(10);
  });
});

describe('computeRecommendation — software', () => {
  it('lifecycle_risk is higher when renewalDate is imminent', () => {
    const imminent = mockSoftware({ renewalDate: new Date(TODAY.getTime() + 25 * 86400000) });
    const far = mockSoftware({ renewalDate: new Date(TODAY.getTime() + 200 * 86400000) });
    expect(computeRecommendation('software_product', imminent, TODAY).score)
      .toBeGreaterThan(computeRecommendation('software_product', far, TODAY).score);
  });

  it('user_impact=25 sub-score when utilization < 0.50 (lower overall score)', () => {
    const lowUtil = mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 40 });
    const highUtil = mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 80 });
    expect(computeRecommendation('software_product', lowUtil, TODAY).score)
      .toBeLessThan(computeRecommendation('software_product', highUtil, TODAY).score);
  });

  it('recommendedAction=renew_with_reduction when renewal_pending and utilization < 0.70', () => {
    const sw = mockSoftware({ status: 'renewal_pending', qtyPurchased: 100, qtyActivelyUsed: 60 });
    expect(computeRecommendation('software_product', sw, TODAY).recommendedAction).toBe('renew_with_reduction');
  });

  it('recommendedAction=renew_as_is when renewal_pending and utilization >= 0.70', () => {
    const sw = mockSoftware({ status: 'renewal_pending', qtyPurchased: 100, qtyActivelyUsed: 75 });
    expect(computeRecommendation('software_product', sw, TODAY).recommendedAction).toBe('renew_as_is');
  });

  it('recommendedAction=replace when status=sunset_planned', () => {
    const sw = mockSoftware({ status: 'sunset_planned' });
    expect(computeRecommendation('software_product', sw, TODAY).recommendedAction).toBe('replace');
  });

  it('recommendedAction=terminate when status=terminated', () => {
    const sw = mockSoftware({ status: 'terminated' });
    expect(computeRecommendation('software_product', sw, TODAY).recommendedAction).toBe('terminate');
  });
});

describe('computeRecommendation — contract', () => {
  it('security_risk is higher when approvalStatus=review_required', () => {
    const reviewed = mockContract({ approvalStatus: 'review_required' });
    const approved = mockContract({ approvalStatus: 'approved' });
    expect(computeRecommendation('contract', reviewed, TODAY).score)
      .toBeGreaterThan(computeRecommendation('contract', approved, TODAY).score);
  });

  it('recommendedAction=renegotiate when lifecycle_risk>=75 and annualCost > $10k', () => {
    const soon = new Date(TODAY.getTime() + 25 * 86400000);
    const contract = mockContract({ renewalDate: soon, annualCost: dec(50000) });
    expect(computeRecommendation('contract', contract, TODAY).recommendedAction).toBe('renegotiate');
  });

  it('recommendedAction=renew_as_is when renewalDate within 90 days and low cost', () => {
    const soon = new Date(TODAY.getTime() + 80 * 86400000);
    const contract = mockContract({ renewalDate: soon, annualCost: dec(2000) });
    expect(computeRecommendation('contract', contract, TODAY).recommendedAction).toBe('renew_as_is');
  });

  it('recommendedAction=monitor when no renewal pressure', () => {
    const contract = mockContract({ renewalDate: null, annualCost: dec(2000) });
    expect(computeRecommendation('contract', contract, TODAY).recommendedAction).toBe('monitor');
  });
});

describe('score classification', () => {
  it('score >= 85 classifies as Must fund', () => {
    const asset = mockHardware({
      criticality: 'mission_critical', replacementYear: CURRENT_YEAR - 1,
      supportEndDate: new Date('2025-01-01'), lifecycleStatus: 'due_for_replacement',
      replacementCost: dec(15000),
    });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.classification).toBe('Must fund');
  });

  it('score 30-49 classifies as Optional or defer', () => {
    const asset = mockHardware({
      criticality: 'medium', replacementYear: CURRENT_YEAR + 5,
      warrantyEndDate: new Date('2025-01-01'),
      purchaseCost: dec(2000),
    });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThan(50);
    expect(result.classification).toBe('Optional or defer');
  });
});

// --- Service method tests ---

const mockPrisma = {
  hardwareAsset: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  softwareProduct: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  contract: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  decisionHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockAuditLog = { log: jest.fn() };

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<RecommendationsService>(RecommendationsService);
  });

  describe('override', () => {
    it('creates DecisionHistory row with correct previousAction for hardware', async () => {
      const existing = mockHardware({ id: 'hw-1', recommendedAction: 'monitor' });
      mockPrisma.hardwareAsset.findUniqueOrThrow.mockResolvedValue(existing);
      mockPrisma.hardwareAsset.update.mockResolvedValue({ ...existing, recommendedAction: 'replace' });
      mockPrisma.decisionHistory.create.mockResolvedValue({
        id: 'dh-1', entityType: 'hardware_asset', entityId: 'hw-1',
        previousAction: 'monitor', newAction: 'replace', rationale: 'Urgent replacement needed',
        userId: 'user-1', createdAt: new Date(),
      });

      await service.override('hardware_asset', 'hw-1', { newAction: 'replace', rationale: 'Urgent replacement needed' }, 'user-1');

      expect(mockPrisma.decisionHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'hardware_asset',
          entityId: 'hw-1',
          previousAction: 'monitor',
          newAction: 'replace',
          rationale: 'Urgent replacement needed',
          userId: 'user-1',
        }),
      });
    });

    it('updates recommendedAction on the hardware entity', async () => {
      const existing = mockHardware({ id: 'hw-1', recommendedAction: null });
      mockPrisma.hardwareAsset.findUniqueOrThrow.mockResolvedValue(existing);
      mockPrisma.hardwareAsset.update.mockResolvedValue({ ...existing, recommendedAction: 'defer' });
      mockPrisma.decisionHistory.create.mockResolvedValue({ id: 'dh-1' });

      await service.override('hardware_asset', 'hw-1', { newAction: 'defer', rationale: 'Budget constraints this year' }, 'user-1');

      expect(mockPrisma.hardwareAsset.update).toHaveBeenCalledWith({
        where: { id: 'hw-1' },
        data: { recommendedAction: 'defer' },
      });
    });

    it('creates AuditLog entry on override', async () => {
      const existing = mockHardware({ id: 'hw-1', recommendedAction: 'monitor' });
      mockPrisma.hardwareAsset.findUniqueOrThrow.mockResolvedValue(existing);
      mockPrisma.hardwareAsset.update.mockResolvedValue(existing);
      mockPrisma.decisionHistory.create.mockResolvedValue({ id: 'dh-1' });

      await service.override('hardware_asset', 'hw-1', { newAction: 'replace', rationale: 'End of support reached' }, 'user-1');

      expect(mockAuditLog.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'OVERRIDE',
        entityType: 'hardware_asset',
        entityId: 'hw-1',
      }));
    });
  });

  describe('getDecisionHistory', () => {
    it('returns rows sorted by createdAt desc', async () => {
      const rows = [
        { id: 'dh-2', createdAt: new Date('2026-05-08') },
        { id: 'dh-1', createdAt: new Date('2026-05-01') },
      ];
      mockPrisma.decisionHistory.findMany.mockResolvedValue(rows);

      const result = await service.getDecisionHistory('hardware_asset', 'hw-1');

      expect(mockPrisma.decisionHistory.findMany).toHaveBeenCalledWith({
        where: { entityType: 'hardware_asset', entityId: 'hw-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result[0].id).toBe('dh-2');
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api && npx jest recommendations.service.spec --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `computeRecommendation` not found.

- [ ] **Step 3: Create `apps/api/src/modules/recommendations/recommendations.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { SoftwareProduct, Contract } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { computeHardwareFields, HardwareAssetWithComputed } from '../hardware-assets/hardware-assets.service';
import { Recommendation } from '@lifecycleiq/shared';

function diffDays(target: Date, from: Date): number {
  return Math.ceil((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function classify(score: number): string {
  if (score >= 85) return 'Must fund';
  if (score >= 70) return 'Strongly recommended';
  if (score >= 50) return 'Plan carefully';
  if (score >= 30) return 'Optional or defer';
  return 'Retirement candidate';
}

function computeHardwareRec(
  asset: HardwareAssetWithComputed,
  today: Date,
): Omit<Recommendation, 'isOverridden' | 'overriddenAction'> {
  const currentYear = today.getFullYear();
  const critMap: Record<string, number> = { low: 25, medium: 50, high: 75, mission_critical: 100 };
  const criticalityScore = critMap[asset.criticality] ?? 50;

  const lifecycleRisk =
    asset.replacementYear === null ? 0
    : asset.replacementYear <= currentYear ? 100
    : asset.replacementYear === currentYear + 1 ? 75
    : asset.replacementYear === currentYear + 2 ? 50
    : 0;

  const securityRisk =
    asset.supportEndDate && asset.supportEndDate < today ? 100
    : asset.warrantyEndDate && asset.warrantyEndDate < today ? 50
    : 0;

  const impactMap: Record<string, number> = { due_for_replacement: 100, active: 50, spare: 25 };
  const userImpact = impactMap[asset.lifecycleStatus] ?? 0;

  const cost = asset.replacementCost ?? asset.purchaseCost;
  const costNum = cost ? (cost as any).toNumber() : 0;
  const financialUrgency = costNum > 10000 ? 100 : costNum > 5000 ? 75 : costNum > 1000 ? 50 : 25;

  const score = Math.round(
    criticalityScore * 0.30 +
    lifecycleRisk * 0.25 +
    securityRisk * 0.20 +
    userImpact * 0.15 +
    financialUrgency * 0.10,
  );

  let recommendedAction = 'monitor';
  if (securityRisk === 100 && asset.criticality === 'mission_critical') recommendedAction = 'replace';
  else if (lifecycleRisk === 100) recommendedAction = 'replace';
  else if (asset.lifecycleStatus === 'due_for_replacement') recommendedAction = 'replace';
  else if (asset.lifecycleStatus === 'spare' && score < 30) recommendedAction = 'retire';

  const name = [asset.manufacturer, asset.model].filter(Boolean).join(' ') || asset.assetTag || asset.id;

  let explanation = `${name} is ${asset.lifecycleStatus}.`;
  if (recommendedAction === 'replace') {
    const reasons: string[] = [];
    if (securityRisk === 100) reasons.push('support has ended');
    if (lifecycleRisk === 100) reasons.push('replacement year has been reached');
    if (asset.lifecycleStatus === 'due_for_replacement') reasons.push('status is due for replacement');
    explanation = `${name}: ${reasons.join(' and ')}. Replacement is recommended.`;
    if (costNum > 0) explanation += ` Estimated cost: $${costNum.toLocaleString()}.`;
  } else {
    explanation += ` Priority score: ${score}.`;
  }

  return { entityType: 'hardware_asset', entityId: asset.id, entityName: name, score, classification: classify(score), recommendedAction, explanation };
}

function computeSoftwareRec(
  product: SoftwareProduct,
  today: Date,
): Omit<Recommendation, 'isOverridden' | 'overriddenAction'> {
  const criticalityScore = product.riskIfNotRenewed ? 75 : 50;

  const lifecycleRisk = !product.renewalDate ? 0 : (() => {
    const d = diffDays(product.renewalDate, today);
    return d < 30 ? 100 : d < 60 ? 75 : d < 90 ? 50 : d < 120 ? 25 : 0;
  })();

  const securityRisk =
    product.status === 'sunset_planned' ? 75
    : product.status === 'replaced' ? 50
    : 0;

  const utilization = product.qtyPurchased && product.qtyActivelyUsed !== null
    ? product.qtyActivelyUsed! / product.qtyPurchased
    : null;
  const userImpact = utilization === null ? 50 : utilization < 0.50 ? 25 : utilization < 0.70 ? 50 : 75;

  const annualCost = product.annualCost ? (product.annualCost as any).toNumber() : 0;
  const financialUrgency = annualCost > 50000 ? 100 : annualCost > 10000 ? 75 : annualCost > 1000 ? 50 : 25;

  const score = Math.round(
    criticalityScore * 0.30 +
    lifecycleRisk * 0.25 +
    securityRisk * 0.20 +
    userImpact * 0.15 +
    financialUrgency * 0.10,
  );

  let recommendedAction = 'monitor';
  if (product.status === 'terminated') recommendedAction = 'terminate';
  else if (product.status === 'sunset_planned' || product.status === 'replaced') recommendedAction = 'replace';
  else if (product.status === 'renewal_pending') {
    recommendedAction = utilization !== null && utilization < 0.70 ? 'renew_with_reduction' : 'renew_as_is';
  } else if (utilization !== null && utilization < 0.50 && product.annualCost) {
    recommendedAction = 'renew_with_reduction';
  }

  let explanation = `${product.name} is ${product.status}.`;
  if (utilization !== null && product.qtyPurchased) {
    const used = product.qtyActivelyUsed ?? 0;
    explanation = `Only ${used} of ${product.qtyPurchased} licenses actively used (${Math.round(utilization * 100)}% utilization).`;
    if (recommendedAction === 'renew_with_reduction') explanation += ' Reducing license count at renewal could lower cost.';
  } else if (product.renewalDate) {
    const d = diffDays(product.renewalDate, today);
    if (d >= 0 && d <= 120) explanation += ` Renewal due in ${d} days.`;
  }

  return { entityType: 'software_product', entityId: product.id, entityName: product.name, score, classification: classify(score), recommendedAction, explanation };
}

function computeContractRec(
  contract: Contract,
  today: Date,
): Omit<Recommendation, 'isOverridden' | 'overriddenAction'> {
  const dueDate = contract.renewalDate ?? contract.endDate;
  const lifecycleRisk = !dueDate ? 0 : (() => {
    const d = diffDays(dueDate, today);
    return d < 30 ? 100 : d < 60 ? 75 : d < 90 ? 50 : d < 120 ? 25 : 0;
  })();

  const securityRisk =
    contract.approvalStatus === 'review_required' ? 75
    : contract.approvalStatus === 'not_reviewed' ? 50
    : 0;

  const annualCost = contract.annualCost ? (contract.annualCost as any).toNumber() : 0;
  const financialUrgency = annualCost > 50000 ? 100 : annualCost > 10000 ? 75 : annualCost > 1000 ? 50 : 25;

  const score = Math.round(
    50 * 0.30 +
    lifecycleRisk * 0.25 +
    securityRisk * 0.20 +
    50 * 0.15 +
    financialUrgency * 0.10,
  );

  let recommendedAction = 'monitor';
  if (lifecycleRisk >= 75 && annualCost > 10000) recommendedAction = 'renegotiate';
  else if (lifecycleRisk >= 50) recommendedAction = 'renew_as_is';

  let explanation = contract.name;
  if (annualCost > 0) explanation += ` ($${annualCost.toLocaleString()}/yr)`;
  if (dueDate) {
    const d = diffDays(dueDate, today);
    if (d >= 0) explanation += ` renews in ${d} days.`;
  }
  if (contract.autoRenewal) explanation += ' Auto-renewal is enabled.';

  return { entityType: 'contract', entityId: contract.id, entityName: contract.name, score, classification: classify(score), recommendedAction, explanation };
}

export function computeRecommendation(
  entityType: 'hardware_asset' | 'software_product' | 'contract',
  entity: HardwareAssetWithComputed | SoftwareProduct | Contract,
  today: Date,
): Omit<Recommendation, 'isOverridden' | 'overriddenAction'> {
  if (entityType === 'hardware_asset') return computeHardwareRec(entity as HardwareAssetWithComputed, today);
  if (entityType === 'software_product') return computeSoftwareRec(entity as SoftwareProduct, today);
  return computeContractRec(entity as Contract, today);
}

function withOverride(computed: Omit<Recommendation, 'isOverridden' | 'overriddenAction'>, storedAction: string | null): Recommendation {
  const isOverridden = storedAction !== null && storedAction !== computed.recommendedAction;
  return { ...computed, isOverridden, overriddenAction: storedAction };
}

@Injectable()
export class RecommendationsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async getRecommendations(params?: { entityType?: string; minScore?: number }): Promise<Recommendation[]> {
    const today = new Date();
    const [rawAssets, software, contracts] = await Promise.all([
      this.prisma.hardwareAsset.findMany(),
      this.prisma.softwareProduct.findMany(),
      this.prisma.contract.findMany(),
    ]);

    const results: Recommendation[] = [
      ...rawAssets.map(a => withOverride(computeRecommendation('hardware_asset', computeHardwareFields(a), today), (a as any).recommendedAction ?? null)),
      ...software.map(s => withOverride(computeRecommendation('software_product', s, today), s.recommendedAction ?? null)),
      ...contracts.map(c => withOverride(computeRecommendation('contract', c, today), (c as any).recommendedAction ?? null)),
    ];

    let filtered = results;
    if (params?.entityType) filtered = filtered.filter(r => r.entityType === params.entityType);
    if (params?.minScore !== undefined) filtered = filtered.filter(r => r.score >= params.minScore!);

    return filtered.sort((a, b) => b.score - a.score);
  }

  async getRecommendation(entityType: string, id: string): Promise<Recommendation> {
    const today = new Date();
    if (entityType === 'hardware_asset') {
      const raw = await this.prisma.hardwareAsset.findUniqueOrThrow({ where: { id } });
      return withOverride(computeRecommendation('hardware_asset', computeHardwareFields(raw), today), (raw as any).recommendedAction ?? null);
    }
    if (entityType === 'software_product') {
      const sw = await this.prisma.softwareProduct.findUniqueOrThrow({ where: { id } });
      return withOverride(computeRecommendation('software_product', sw, today), sw.recommendedAction ?? null);
    }
    const contract = await this.prisma.contract.findUniqueOrThrow({ where: { id } });
    return withOverride(computeRecommendation('contract', contract, today), (contract as any).recommendedAction ?? null);
  }

  async override(entityType: string, id: string, dto: { newAction: string; rationale: string }, userId: string) {
    let previousAction: string | null = null;

    if (entityType === 'hardware_asset') {
      const existing = await this.prisma.hardwareAsset.findUniqueOrThrow({ where: { id } });
      previousAction = (existing as any).recommendedAction ?? null;
      await this.prisma.hardwareAsset.update({ where: { id }, data: { recommendedAction: dto.newAction as any } });
    } else if (entityType === 'software_product') {
      const existing = await this.prisma.softwareProduct.findUniqueOrThrow({ where: { id } });
      previousAction = existing.recommendedAction ?? null;
      await this.prisma.softwareProduct.update({ where: { id }, data: { recommendedAction: dto.newAction as any } });
    } else {
      const existing = await this.prisma.contract.findUniqueOrThrow({ where: { id } });
      previousAction = (existing as any).recommendedAction ?? null;
      await this.prisma.contract.update({ where: { id }, data: { recommendedAction: dto.newAction as any } });
    }

    const history = await this.prisma.decisionHistory.create({
      data: { entityType, entityId: id, previousAction, newAction: dto.newAction, rationale: dto.rationale, userId },
    });

    await this.auditLog.log({
      userId,
      action: 'OVERRIDE',
      entityType,
      entityId: id,
      oldValue: { recommendedAction: previousAction },
      newValue: { recommendedAction: dto.newAction, rationale: dto.rationale },
    });

    return history;
  }

  async getDecisionHistory(entityType: string, entityId: string) {
    return this.prisma.decisionHistory.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npx jest recommendations.service.spec --no-coverage 2>&1 | tail -10
```

Expected: all tests passing (19 tests), 0 failures.

- [ ] **Step 5: Create the DTO**

Create `apps/api/src/modules/recommendations/dto/update-recommendation.dto.ts`:

```typescript
import { IsEnum, IsString, MinLength } from 'class-validator';
import { RecommendedAction } from '@prisma/client';

export class UpdateRecommendationDto {
  @IsEnum(RecommendedAction)
  newAction: string;

  @IsString()
  @MinLength(10)
  rationale: string;
}
```

- [ ] **Step 6: Create the controller**

Create `apps/api/src/modules/recommendations/recommendations.controller.ts`:

```typescript
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AuthUser } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecommendationsService } from './recommendations.service';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private service: RecommendationsService) {}

  @Get()
  getAll(
    @Query('entityType') entityType?: string,
    @Query('minScore') minScore?: string,
  ) {
    const min = minScore ? parseInt(minScore, 10) : undefined;
    return this.service.getRecommendations({
      entityType,
      minScore: min !== undefined && !isNaN(min) ? min : undefined,
    });
  }

  @Get('history/:entityType/:id')
  getHistory(
    @Param('entityType') entityType: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getDecisionHistory(entityType, id);
  }

  @Get(':entityType/:id')
  getOne(
    @Param('entityType') entityType: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getRecommendation(entityType, id);
  }

  @Post(':entityType/:id/override')
  override(
    @Param('entityType') entityType: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecommendationDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.service.override(entityType, id, dto, user!.id);
  }
}
```

- [ ] **Step 7: Create the module**

Create `apps/api/src/modules/recommendations/recommendations.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/recommendations/
git commit -m "feat: add RecommendationsModule with computeRecommendation TDD (19 tests)"
```

---

## Task 6: Register Modules in AppModule + Full Test Run

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add AlertsModule and RecommendationsModule to AppModule**

Open `apps/api/src/app.module.ts`. Add two imports at the top:

```typescript
import { AlertsModule } from './modules/alerts/alerts.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
```

And add both to the `imports` array (after `BudgetModule`):

```typescript
AlertsModule,
RecommendationsModule,
```

- [ ] **Step 2: Run the full test suite**

```bash
cd apps/api && npx jest --no-coverage 2>&1 | tail -15
```

Expected: all tests passing (150+), 0 failures. If any test fails, fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat: register AlertsModule and RecommendationsModule in AppModule"
```

---

## Task 7: Frontend Server Actions

**Files:**
- Create: `apps/web/lib/actions/alerts.ts`
- Create: `apps/web/lib/actions/recommendations.ts`

- [ ] **Step 1: Create `apps/web/lib/actions/alerts.ts`**

```typescript
'use server';

import { apiServer } from '@/lib/api';
import type { Alert } from '@lifecycleiq/shared';

export async function getAlerts(params?: {
  entityType?: string;
  severity?: string;
  days?: number;
}): Promise<Alert[]> {
  const qs = new URLSearchParams();
  if (params?.entityType) qs.set('entityType', params.entityType);
  if (params?.severity) qs.set('severity', params.severity);
  if (params?.days !== undefined) qs.set('days', String(params.days));
  const query = qs.toString();
  return apiServer(`/api/v1/alerts${query ? `?${query}` : ''}`);
}
```

- [ ] **Step 2: Create `apps/web/lib/actions/recommendations.ts`**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Recommendation, DecisionHistory, UpdateRecommendationInput } from '@lifecycleiq/shared';

export async function getRecommendations(params?: {
  entityType?: string;
  minScore?: number;
}): Promise<Recommendation[]> {
  const qs = new URLSearchParams();
  if (params?.entityType) qs.set('entityType', params.entityType);
  if (params?.minScore !== undefined) qs.set('minScore', String(params.minScore));
  const query = qs.toString();
  return apiServer(`/api/v1/recommendations${query ? `?${query}` : ''}`);
}

export async function getRecommendation(entityType: string, id: string): Promise<Recommendation> {
  return apiServer(`/api/v1/recommendations/${entityType}/${id}`);
}

export async function overrideRecommendation(
  entityType: string,
  id: string,
  input: UpdateRecommendationInput,
): Promise<DecisionHistory> {
  const result = await apiServer<DecisionHistory>(
    `/api/v1/recommendations/${entityType}/${id}/override`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidatePath('/decisions');
  revalidatePath('/dashboard');
  return result;
}

export async function getDecisionHistory(
  entityType: string,
  id: string,
): Promise<DecisionHistory[]> {
  return apiServer(`/api/v1/recommendations/history/${entityType}/${id}`);
}
```

- [ ] **Step 3: Confirm TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to these new files).

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/actions/alerts.ts apps/web/lib/actions/recommendations.ts
git commit -m "feat: add alerts and recommendations server actions"
```

---

## Task 8: Dashboard Page

**Files:**
- Rewrite: `apps/web/app/(protected)/dashboard/page.tsx`
- Create: `apps/web/app/(protected)/dashboard/client.tsx`

- [ ] **Step 1: Rewrite `apps/web/app/(protected)/dashboard/page.tsx`**

```typescript
import { getForecast } from '@/lib/actions/budget';
import { getAlerts } from '@/lib/actions/alerts';
import { getRecommendations } from '@/lib/actions/recommendations';
import { DashboardClient } from './client';

export default async function DashboardPage() {
  const [forecast, alerts, recommendations] = await Promise.all([
    getForecast(),
    getAlerts(),
    getRecommendations(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      <DashboardClient forecast={forecast} alerts={alerts} recommendations={recommendations} />
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(protected)/dashboard/client.tsx`**

```typescript
'use client';

import { BudgetClient } from '../budget/client';
import type { ForecastYear, Alert, Recommendation } from '@lifecycleiq/shared';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

const ENTITY_LABELS: Record<string, string> = {
  hardware_asset: 'Hardware',
  software_product: 'Software',
  contract: 'Contract',
};

interface Props {
  forecast: ForecastYear[];
  alerts: Alert[];
  recommendations: Recommendation[];
}

export function DashboardClient({ forecast, alerts, recommendations }: Props) {
  const currentFY = forecast[0];

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highPriorityRecs = recommendations.filter(r => r.score >= 70).length;

  function formatMoney(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  }

  // Merge alerts + high-priority recs into upcoming decisions list
  const alertRows = alerts
    .filter(a => a.severity === 'critical' || a.severity === 'high')
    .map(a => ({
      key: a.id,
      name: a.entityName,
      type: ENTITY_LABELS[a.entityType] ?? a.entityType,
      issue: a.message,
      urgency: a.severity,
      urgencyType: 'alert' as const,
      dueDate: a.dueDate,
      action: null,
    }));

  const recRows = recommendations
    .filter(r => r.score >= 50)
    .map(r => ({
      key: `rec-${r.entityType}-${r.entityId}`,
      name: r.entityName,
      type: ENTITY_LABELS[r.entityType] ?? r.entityType,
      issue: r.explanation.length > 80 ? r.explanation.slice(0, 77) + '…' : r.explanation,
      urgency: r.score >= 85 ? 'critical' : r.score >= 70 ? 'high' : 'medium',
      urgencyType: 'rec' as const,
      dueDate: null,
      action: r.recommendedAction,
    }));

  const allRows = [
    ...alertRows.sort((a, b) => SEVERITY_ORDER[a.urgency as keyof typeof SEVERITY_ORDER] - SEVERITY_ORDER[b.urgency as keyof typeof SEVERITY_ORDER]),
    ...recRows,
  ].slice(0, 15);

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Current FY OpEx', value: currentFY ? formatMoney(currentFY.opex) : '—' },
          { label: 'Current FY CapEx', value: currentFY ? formatMoney(currentFY.capex) : '—' },
          { label: 'Critical Alerts', value: String(criticalAlerts), warn: criticalAlerts > 0 },
          { label: 'High-Priority Items', value: String(highPriorityRecs), warn: highPriorityRecs > 0 },
        ].map(card => (
          <div key={card.label} className={`bg-white border rounded-lg p-4 ${card.warn ? 'border-orange-300' : 'border-gray-200'}`}>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${card.warn ? 'text-orange-600' : 'text-gray-900'}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Upcoming decisions */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Upcoming Decisions</h2>
        </div>
        {allRows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No urgent items at this time.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Issue</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Urgency</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Due</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allRows.map(row => (
                <tr key={row.key} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900 max-w-[140px] truncate">{row.name}</td>
                  <td className="px-4 py-2 text-gray-500">{row.type}</td>
                  <td className="px-4 py-2 text-gray-700 max-w-[240px] truncate">{row.issue}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[row.urgency] ?? 'bg-gray-100 text-gray-600'}`}>
                      {row.urgency}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{row.dueDate ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-700 capitalize">{row.action?.replace(/_/g, ' ') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Budget roadmap chart — reuse Phase 3 component */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Budget Roadmap</h2>
        <BudgetClient forecast={forecast} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Confirm TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "dashboard" | head -10
```

Expected: no errors in dashboard files.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(protected\)/dashboard/
git commit -m "feat: rebuild dashboard page with summary cards, upcoming decisions table, and budget chart"
```

---

## Task 9: Decisions Page

**Files:**
- Rewrite: `apps/web/app/(protected)/decisions/page.tsx`
- Create: `apps/web/app/(protected)/decisions/client.tsx`

- [ ] **Step 1: Rewrite `apps/web/app/(protected)/decisions/page.tsx`**

```typescript
import { getRecommendations } from '@/lib/actions/recommendations';
import { DecisionsClient } from './client';

export default async function DecisionsPage() {
  const recommendations = await getRecommendations();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Decisions</h1>
      <DecisionsClient recommendations={recommendations} />
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(protected)/decisions/client.tsx`**

```typescript
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { overrideRecommendation, getDecisionHistory } from '@/lib/actions/recommendations';
import type { Recommendation, DecisionHistory } from '@lifecycleiq/shared';

type Tab = 'all' | 'hardware_asset' | 'software_product' | 'contract';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hardware_asset', label: 'Hardware' },
  { key: 'software_product', label: 'Software' },
  { key: 'contract', label: 'Contracts' },
];

const ACTION_OPTIONS = [
  { value: 'renew_as_is', label: 'Renew as-is' },
  { value: 'renew_with_reduction', label: 'Renew with reduction' },
  { value: 'renegotiate', label: 'Renegotiate' },
  { value: 'replace', label: 'Replace' },
  { value: 'retire', label: 'Retire' },
  { value: 'defer', label: 'Defer' },
  { value: 'consolidate', label: 'Consolidate' },
  { value: 'terminate', label: 'Terminate' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'escalate', label: 'Escalate' },
];

const SCORE_COLORS: Record<string, string> = {
  'Must fund': 'bg-red-100 text-red-700',
  'Strongly recommended': 'bg-orange-100 text-orange-700',
  'Plan carefully': 'bg-yellow-100 text-yellow-700',
  'Optional or defer': 'bg-gray-100 text-gray-600',
  'Retirement candidate': 'bg-gray-100 text-gray-400',
};

interface OverrideDialogProps {
  item: Recommendation;
  onClose: () => void;
}

function OverrideDialog({ item, onClose }: OverrideDialogProps) {
  const router = useRouter();
  const [newAction, setNewAction] = useState(item.recommendedAction);
  const [rationale, setRationale] = useState('');
  const [history, setHistory] = useState<DecisionHistory[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getDecisionHistory(item.entityType, item.entityId).then(setHistory);
  }, [item.entityType, item.entityId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rationale.length < 10) return;
    startTransition(async () => {
      await overrideRecommendation(item.entityType, item.entityId, { newAction, rationale });
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Override Recommendation</h2>
        <p className="text-sm text-gray-500 mb-4">{item.entityName}</p>

        <div className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 rounded">
          <span className="font-medium">Computed: </span>
          <span className="capitalize">{item.recommendedAction.replace(/_/g, ' ')}</span>
          <span className="text-gray-400 ml-2">(score: {item.score})</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Action</label>
            <select
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
              className="w-full rounded-md border-gray-300 text-sm"
            >
              {ACTION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rationale <span className="text-gray-400">(min 10 characters)</span>
            </label>
            <textarea
              value={rationale}
              onChange={e => setRationale(e.target.value)}
              rows={3}
              minLength={10}
              required
              className="w-full rounded-md border-gray-300 text-sm"
              placeholder="Explain why you are overriding this recommendation…"
            />
          </div>

          {history && history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">
                {history.length} previous decision{history.length > 1 ? 's' : ''}
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                    <span className="font-medium">{h.previousAction ?? 'none'} → {h.newAction}</span>
                    {': '}{h.rationale}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={pending || rationale.length < 10}
              className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save Override'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface Props {
  recommendations: Recommendation[];
}

export function DecisionsClient({ recommendations }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [overrideItem, setOverrideItem] = useState<Recommendation | null>(null);

  const filtered = activeTab === 'all'
    ? recommendations
    : recommendations.filter(r => r.entityType === activeTab);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-400">
              ({activeTab === t.key || t.key === 'all'
                ? (t.key === 'all' ? recommendations : recommendations.filter(r => r.entityType === t.key)).length
                : recommendations.filter(r => r.entityType === t.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No recommendations in this category.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Classification</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recommended Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Explanation</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={`${r.entityType}:${r.entityId}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{r.entityName}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono">{r.score}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SCORE_COLORS[r.classification] ?? 'bg-gray-100 text-gray-600'}`}>
                      {r.classification}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-gray-700">
                      {r.isOverridden
                        ? <><span className="line-through text-gray-400 mr-1">{r.recommendedAction.replace(/_/g, ' ')}</span><span className="text-blue-600">{r.overriddenAction?.replace(/_/g, ' ')}</span><span className="ml-1 text-xs text-blue-400">(overridden)</span></>
                        : r.recommendedAction.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[260px]">
                    <span title={r.explanation}>
                      {r.explanation.length > 90 ? r.explanation.slice(0, 87) + '…' : r.explanation}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setOverrideItem(r)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
                    >
                      Override
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {overrideItem && (
        <OverrideDialog
          item={overrideItem}
          onClose={() => setOverrideItem(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Confirm TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "decisions" | head -10
```

Expected: no errors in decisions files.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(protected\)/decisions/
git commit -m "feat: rebuild decisions page with tabbed recommendations table and override dialog"
```

---

## Task 10: Final TypeScript Check + Test Run

**Files:** none created

- [ ] **Step 1: Run the full API test suite**

```bash
cd apps/api && npx jest --no-coverage 2>&1 | tail -10
```

Expected: all tests passing (150+), 0 failures.

- [ ] **Step 2: TypeScript check on the API**

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If you see errors about `annualMaintenanceCost` or `recommendedAction` on Prisma types, run `npx prisma generate` first.

- [ ] **Step 3: TypeScript check on the web app**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: TypeScript check on shared package**

```bash
cd packages/shared && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git status
git commit -m "chore: Phase 4 complete — recommendations, alerts, dashboard, decisions"
```
