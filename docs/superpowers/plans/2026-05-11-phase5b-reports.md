# Phase 5b: Reports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four live-preview executive report pages (Executive Budget Summary, Renewal Review, Capital Replacement, Software Optimization) with CSV download to the LifecycleIQ MVP.

**Architecture:** A `ReportsModule` is added to the NestJS API with a `ReportsService` that imports `computeForecast` (from `budget.service.ts`) and `computeRecommendation` (from `recommendations.service.ts`) as pure functions — no service class injection needed, no circular dependencies. The frontend fetches typed report JSON via server actions and renders live preview tables; CSV is generated client-side from the same JSON.

**Tech Stack:** NestJS + Prisma 5, `@lifecycleiq/shared` for report types, Next.js 14 App Router server components, client-side CSV generation.

**Worktree:** `feature/phase-5b` from `master` at `/Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b`

---

## File Map

| File | Action |
|------|--------|
| `packages/shared/src/types/reports.ts` | Create |
| `packages/shared/src/index.ts` | Modify — export report types |
| `apps/api/src/modules/reports/reports.service.spec.ts` | Create |
| `apps/api/src/modules/reports/reports.service.ts` | Create |
| `apps/api/src/modules/reports/reports.controller.ts` | Create |
| `apps/api/src/modules/reports/reports.module.ts` | Create |
| `apps/api/src/app.module.ts` | Modify — register `ReportsModule` |
| `apps/web/lib/utils/csv.ts` | Create |
| `apps/web/lib/actions/reports.ts` | Create |
| `apps/web/app/(protected)/reports/page.tsx` | Rewrite — navigation hub |
| `apps/web/app/(protected)/reports/executive-budget/page.tsx` | Create |
| `apps/web/app/(protected)/reports/executive-budget/client.tsx` | Create |
| `apps/web/app/(protected)/reports/renewal-review/page.tsx` | Create |
| `apps/web/app/(protected)/reports/renewal-review/client.tsx` | Create |
| `apps/web/app/(protected)/reports/capital-replacement/page.tsx` | Create |
| `apps/web/app/(protected)/reports/capital-replacement/client.tsx` | Create |
| `apps/web/app/(protected)/reports/software-optimization/page.tsx` | Create |
| `apps/web/app/(protected)/reports/software-optimization/client.tsx` | Create |

---

## Task 1: Worktree Setup + Baseline

**Files:** none

- [ ] **Step 1: Create worktree**

```bash
cd /Users/david/LifeCycleIQ_Claude
git pull origin master
git worktree add .worktrees/phase-5b -b feature/phase-5b
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/api
pnpm install
pnpm db:generate
```

- [ ] **Step 3: Run baseline tests**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: all tests pass (note the total count — it will be the baseline for later).

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b
git commit --allow-empty -m "chore: start phase-5b worktree from master"
```

---

## Task 2: Shared Report Types

**Files:**
- Create: `packages/shared/src/types/reports.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/src/types/reports.ts`**

```typescript
export interface ExecutiveBudgetReport {
  currentYearOpex: number;
  currentYearCapex: number;
  threeYearTotal: number;
  sevenYearTotal: number;
  spikeYears: number[];
  topRenewals: {
    name: string;
    type: string;
    renewalDate: string | null;
    cost: number;
  }[];
  topCapitalReplacements: {
    name: string;
    assetType: string;
    replacementYear: number | null;
    cost: number;
  }[];
  savingsOpportunities: {
    name: string;
    annualCost: number;
    utilizationRate: number;
    potentialSavings: number;
  }[];
  highPriorityRecommendations: {
    name: string;
    entityType: string;
    action: string;
    score: number;
    classification: string;
  }[];
}

export interface RenewalReviewReport {
  upcomingRenewals: {
    name: string;
    type: string;
    renewalDate: string;
    cost: number;
    recommendedAction: string | null;
    approvalStatus: string | null;
  }[];
  cancellationDeadlines: {
    name: string;
    deadline: string;
    renewalDate: string;
    cost: number;
  }[];
}

export interface CapitalReplacementReport {
  byYear: {
    fiscalYear: number;
    assets: {
      name: string;
      assetType: string;
      cost: number;
      location: string | null;
      department: string | null;
    }[];
  }[];
  riskItems: {
    name: string;
    assetTag: string | null;
    criticality: string;
    supportEndDate: string | null;
    warrantyEndDate: string | null;
  }[];
}

export interface SoftwareOptimizationReport {
  lowUtilization: {
    name: string;
    utilizationRate: number;
    qtPurchased: number;
    qtUsed: number;
    annualCost: number;
    potentialSavings: number;
  }[];
  terminationCandidates: {
    name: string;
    annualCost: number;
    action: string;
    score: number;
  }[];
}
```

- [ ] **Step 2: Export from `packages/shared/src/index.ts`**

Add this line at the end of `packages/shared/src/index.ts`:

```typescript
export * from './types/reports';
```

- [ ] **Step 3: Verify shared package compiles**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/packages/shared
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b
git add packages/shared/
git commit -m "feat: add ExecutiveBudgetReport, RenewalReviewReport, CapitalReplacementReport, SoftwareOptimizationReport shared types"
```

---

## Task 3: ReportsModule TDD — All Four Report Methods

**Files:**
- Create: `apps/api/src/modules/reports/reports.service.spec.ts` (partial — first two methods)
- Create: `apps/api/src/modules/reports/reports.service.ts` (partial — first two methods)

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/api/src/modules/reports
```

- [ ] **Step 2: Write failing tests for `getExecutiveBudget` and `getRenewalReview`**

Create `apps/api/src/modules/reports/reports.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Mock helpers ────────────────────────────────────────────────────────────

function dec(n: number) { return { toNumber: () => n } as any; }

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function mockAsset(overrides: any = {}) {
  return {
    id: 'hw-1', assetTag: 'HW-001', assetType: 'laptop',
    manufacturer: 'Dell', model: 'XPS 15',
    lifecycleStatus: 'active', criticality: 'medium',
    purchaseDate: new Date('2020-01-01'), usefulLifeYears: 4,
    purchaseCost: dec(2000), replacementCost: null,
    replacementYearOverride: null, annualMaintenanceCost: null,
    warrantyEndDate: null, supportEndDate: null,
    location: null, department: null,
    ...overrides,
  };
}

function mockSoftware(overrides: any = {}) {
  return {
    id: 'sw-1', name: 'Microsoft 365', status: 'active',
    annualCost: dec(9000), unitCost: dec(30),
    qtyPurchased: 100, qtyActivelyUsed: 60,
    renewalDate: null, noticePeriodDays: null,
    recommendedAction: null, riskIfNotRenewed: null,
    ...overrides,
  };
}

function mockContract(overrides: any = {}) {
  return {
    id: 'ct-1', name: 'Microsoft EA',
    renewalDate: null, noticePeriodDays: null,
    cancellationDeadlineOverride: null,
    annualCost: dec(5000), approvalStatus: 'not_reviewed',
    recommendedAction: null, autoRenewal: false,
    endDate: null,
    ...overrides,
  };
}

const mockFiscalSettings = {
  id: 'fys-1',
  fiscalYearStartMonth: 1,
  defaultEscalationRate: { toNumber: () => 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  fiscalYearSettings: { findFirst: jest.fn() },
  hardwareAsset: { findMany: jest.fn() },
  softwareProduct: { findMany: jest.fn() },
  contract: { findMany: jest.fn() },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(mockFiscalSettings);
    mockPrisma.hardwareAsset.findMany.mockResolvedValue([]);
    mockPrisma.softwareProduct.findMany.mockResolvedValue([]);
    mockPrisma.contract.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ReportsService>(ReportsService);
  });

  // ── getExecutiveBudget ────────────────────────────────────────────────────

  describe('getExecutiveBudget', () => {
    it('returns currentYearOpex and currentYearCapex from forecast', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ replacementYearOverride: new Date().getFullYear(), purchaseCost: dec(3000) }),
      ]);
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getExecutiveBudget();
      // hardware replacement → CapEx; software → OpEx
      expect(result.currentYearCapex).toBeGreaterThan(0);
      expect(result.currentYearOpex).toBeGreaterThan(0);
    });

    it('computes threeYearTotal as sum of first 3 forecast years', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ annualCost: dec(1000), qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getExecutiveBudget();
      // With 0% escalation, each year OpEx = 1000 → 3-year = 3000
      expect(result.threeYearTotal).toBeCloseTo(3000, 0);
    });

    it('computes sevenYearTotal as sum of all 7 forecast years', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ annualCost: dec(1000), qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.sevenYearTotal).toBeCloseTo(7000, 0);
    });

    it('includes contracts with renewalDate within 120 days in topRenewals', async () => {
      const contract = mockContract({ renewalDate: daysFromNow(30), annualCost: dec(5000) });
      mockPrisma.contract.findMany.mockResolvedValue([contract]);
      const result = await service.getExecutiveBudget();
      expect(result.topRenewals).toHaveLength(1);
      expect(result.topRenewals[0].name).toBe('Microsoft EA');
      expect(result.topRenewals[0].type).toBe('Contract');
    });

    it('excludes contracts with renewalDate beyond 120 days from topRenewals', async () => {
      const contract = mockContract({ renewalDate: daysFromNow(200), annualCost: dec(5000) });
      mockPrisma.contract.findMany.mockResolvedValue([contract]);
      const result = await service.getExecutiveBudget();
      expect(result.topRenewals).toHaveLength(0);
    });

    it('sorts topRenewals by cost descending', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ id: 'c1', name: 'Cheap', renewalDate: daysFromNow(10), annualCost: dec(1000) }),
        mockContract({ id: 'c2', name: 'Expensive', renewalDate: daysFromNow(10), annualCost: dec(9000) }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.topRenewals[0].name).toBe('Expensive');
      expect(result.topRenewals[1].name).toBe('Cheap');
    });

    it('returns savingsOpportunities for software with utilization < 0.70', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 50, annualCost: dec(3000), unitCost: dec(30) }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.savingsOpportunities).toHaveLength(1);
      expect(result.savingsOpportunities[0].utilizationRate).toBeCloseTo(0.5);
      expect(result.savingsOpportunities[0].potentialSavings).toBeCloseTo(50 * 30); // 50 unused × $30
    });

    it('excludes software with utilization >= 0.70 from savingsOpportunities', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 80 }), // 80% utilization
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.savingsOpportunities).toHaveLength(0);
    });

    it('returns highPriorityRecommendations with score >= 70', async () => {
      // A mission_critical asset with expired support will score very high
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({
          criticality: 'mission_critical',
          supportEndDate: new Date('2020-01-01'), // expired
          lifecycleStatus: 'due_for_replacement',
          replacementYearOverride: new Date().getFullYear(),
          purchaseCost: dec(50000),
        }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.highPriorityRecommendations.length).toBeGreaterThan(0);
      expect(result.highPriorityRecommendations[0].score).toBeGreaterThanOrEqual(70);
    });
  });

  // ── getRenewalReview ──────────────────────────────────────────────────────

  describe('getRenewalReview', () => {
    it('returns contracts with renewalDate within 120 days', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(45) }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.upcomingRenewals).toHaveLength(1);
      expect(result.upcomingRenewals[0].type).toBe('Contract');
    });

    it('returns software with renewalDate within 120 days', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ renewalDate: daysFromNow(60), qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.upcomingRenewals).toHaveLength(1);
      expect(result.upcomingRenewals[0].type).toBe('Software');
    });

    it('excludes contracts with renewalDate beyond 120 days from upcomingRenewals', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(180) }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.upcomingRenewals).toHaveLength(0);
    });

    it('computes cancellation deadline from renewalDate minus noticePeriodDays', async () => {
      // renewal in 60 days, 30 days notice → deadline in 30 days (within 120)
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(60), noticePeriodDays: 30 }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.cancellationDeadlines).toHaveLength(1);
    });

    it('uses cancellationDeadlineOverride when set', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({
          renewalDate: daysFromNow(200),  // would not be in renewals
          cancellationDeadlineOverride: daysFromNow(30),
        }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.cancellationDeadlines).toHaveLength(1);
    });

    it('excludes contracts whose cancellation deadline is beyond 120 days', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(200), noticePeriodDays: 30 }), // deadline = 170 days
      ]);
      const result = await service.getRenewalReview();
      expect(result.cancellationDeadlines).toHaveLength(0);
    });
  });

  // ── getCapitalReplacement ─────────────────────────────────────────────────

  describe('getCapitalReplacement', () => {
    it('groups assets by their replacement year', async () => {
      const thisYear = new Date().getFullYear();
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ replacementYearOverride: thisYear, purchaseCost: dec(1000) }),
      ]);
      const result = await service.getCapitalReplacement();
      const yearGroup = result.byYear.find(g => g.fiscalYear === thisYear);
      expect(yearGroup).toBeDefined();
      expect(yearGroup!.assets).toHaveLength(1);
    });

    it('excludes retired and disposed assets from byYear', async () => {
      const thisYear = new Date().getFullYear();
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ replacementYearOverride: thisYear, lifecycleStatus: 'retired' }),
        mockAsset({ id: 'hw-2', replacementYearOverride: thisYear, lifecycleStatus: 'disposed' }),
      ]);
      const result = await service.getCapitalReplacement();
      const yearGroup = result.byYear.find(g => g.fiscalYear === thisYear);
      expect(yearGroup).toBeUndefined();
    });

    it('returns riskItems for assets with expired supportEndDate', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ supportEndDate: new Date('2020-01-01') }),
      ]);
      const result = await service.getCapitalReplacement();
      expect(result.riskItems).toHaveLength(1);
      expect(result.riskItems[0].supportEndDate).toBeTruthy();
    });

    it('returns riskItems for assets with expired warrantyEndDate', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ warrantyEndDate: new Date('2020-01-01') }),
      ]);
      const result = await service.getCapitalReplacement();
      expect(result.riskItems).toHaveLength(1);
    });

    it('does not return riskItems for assets with future warranty/support dates', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ warrantyEndDate: daysFromNow(365), supportEndDate: daysFromNow(365) }),
      ]);
      const result = await service.getCapitalReplacement();
      expect(result.riskItems).toHaveLength(0);
    });
  });

  // ── getSoftwareOptimization ───────────────────────────────────────────────

  describe('getSoftwareOptimization', () => {
    it('returns software with utilization < 0.70', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 60 }), // 60% util
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.lowUtilization).toHaveLength(1);
    });

    it('excludes software with utilization >= 0.70', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 75 }), // 75% util
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.lowUtilization).toHaveLength(0);
    });

    it('excludes terminated software from lowUtilization', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 10, status: 'terminated' }),
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.lowUtilization).toHaveLength(0);
    });

    it('calculates potentialSavings as unusedLicenses × unitCost', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 50, unitCost: dec(20) }),
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.lowUtilization[0].potentialSavings).toBeCloseTo(50 * 20); // 50 unused × $20
    });

    it('returns termination candidates from computed recommendations', async () => {
      // A terminated-status software triggers terminate recommendation
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ status: 'terminated', qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.terminationCandidates).toHaveLength(1);
      expect(result.terminationCandidates[0].action).toBe('terminate');
    });
  });
});
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/api
npx jest --testPathPattern="reports.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: FAIL — "Cannot find module './reports.service'"

- [ ] **Step 4: Create `apps/api/src/modules/reports/reports.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeForecast } from '../budget/budget.service';
import { computeRecommendation } from '../recommendations/recommendations.service';
import { computeHardwareFields } from '../hardware-assets/hardware-assets.service';
import {
  ExecutiveBudgetReport,
  RenewalReviewReport,
  CapitalReplacementReport,
  SoftwareOptimizationReport,
} from '@lifecycleiq/shared';

const RENEWAL_WINDOW_DAYS = 120;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async getFiscalSettings() {
    const s = await this.prisma.fiscalYearSettings.findFirst();
    return s
      ? { fiscalYearStartMonth: s.fiscalYearStartMonth, defaultEscalationRate: Number(s.defaultEscalationRate) }
      : { fiscalYearStartMonth: 1, defaultEscalationRate: 0.03 };
  }

  private currentFiscalYear(fiscalYearStartMonth: number, today: Date): number {
    return today.getMonth() + 1 >= fiscalYearStartMonth
      ? today.getFullYear()
      : today.getFullYear() - 1;
  }

  async getExecutiveBudget(): Promise<ExecutiveBudgetReport> {
    const today = new Date();
    const settings = await this.getFiscalSettings();
    const [assets, software, contracts] = await Promise.all([
      this.prisma.hardwareAsset.findMany(),
      this.prisma.softwareProduct.findMany(),
      this.prisma.contract.findMany(),
    ]);

    const forecast = computeForecast(assets, software, contracts, settings, 7, today);
    const threeYearTotal = forecast.slice(0, 3).reduce((s, y) => s + y.total, 0);
    const sevenYearTotal = forecast.reduce((s, y) => s + y.total, 0);
    const spikeYears = forecast.filter(y => y.isSpike).map(y => y.fiscalYear);

    const cutoff = addDays(today, RENEWAL_WINDOW_DAYS);

    const contractRenewals = contracts
      .filter(c => c.renewalDate && c.renewalDate >= today && c.renewalDate <= cutoff && c.annualCost)
      .map(c => ({
        name: c.name,
        type: 'Contract',
        renewalDate: c.renewalDate!.toISOString().split('T')[0],
        cost: (c.annualCost as any).toNumber(),
      }));

    const softwareRenewals = software
      .filter(s => s.renewalDate && s.renewalDate >= today && s.renewalDate <= cutoff && s.annualCost)
      .map(s => ({
        name: s.name,
        type: 'Software',
        renewalDate: s.renewalDate!.toISOString().split('T')[0],
        cost: (s.annualCost as any).toNumber(),
      }));

    const topRenewals = [...contractRenewals, ...softwareRenewals]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    const currentFY = this.currentFiscalYear(settings.fiscalYearStartMonth, today);
    const topCapitalReplacements = assets
      .filter(a => a.lifecycleStatus !== 'retired' && a.lifecycleStatus !== 'disposed')
      .map(a => {
        const replacementYear =
          a.replacementYearOverride ??
          (a.purchaseDate && a.usefulLifeYears
            ? a.purchaseDate.getUTCFullYear() + a.usefulLifeYears
            : null);
        const cost = a.replacementCost ?? a.purchaseCost;
        return {
          name: [a.manufacturer, a.model].filter(Boolean).join(' ') || a.assetTag || a.id,
          assetType: a.assetType as string,
          replacementYear,
          cost: cost ? (cost as any).toNumber() : 0,
        };
      })
      .filter(a => a.replacementYear !== null && a.replacementYear >= currentFY && a.replacementYear <= currentFY + 6)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    const savingsOpportunities = software
      .filter(s => s.qtyPurchased && s.qtyPurchased > 0 && s.qtyActivelyUsed !== null && s.qtyActivelyUsed !== undefined && s.annualCost)
      .map(s => {
        const utilizationRate = s.qtyActivelyUsed! / s.qtyPurchased!;
        const annualCost = (s.annualCost as any).toNumber();
        const unusedLicenses = s.qtyPurchased! - s.qtyActivelyUsed!;
        const unitCost = s.unitCost ? (s.unitCost as any).toNumber() : annualCost / s.qtyPurchased!;
        const potentialSavings = unusedLicenses * unitCost;
        return { name: s.name, annualCost, utilizationRate, potentialSavings };
      })
      .filter(s => s.utilizationRate < 0.70)
      .sort((a, b) => b.potentialSavings - a.potentialSavings);

    const allRecs = [
      ...assets.map(a => computeRecommendation('hardware_asset', computeHardwareFields(a), today)),
      ...software.map(s => computeRecommendation('software_product', s, today)),
      ...contracts.map(c => computeRecommendation('contract', c, today)),
    ];
    const highPriorityRecommendations = allRecs
      .filter(r => r.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => ({
        name: r.entityName,
        entityType: r.entityType,
        action: r.recommendedAction,
        score: r.score,
        classification: r.classification,
      }));

    return {
      currentYearOpex: forecast[0]?.opex ?? 0,
      currentYearCapex: forecast[0]?.capex ?? 0,
      threeYearTotal,
      sevenYearTotal,
      spikeYears,
      topRenewals,
      topCapitalReplacements,
      savingsOpportunities,
      highPriorityRecommendations,
    };
  }

  async getRenewalReview(): Promise<RenewalReviewReport> {
    const today = new Date();
    const cutoff = addDays(today, RENEWAL_WINDOW_DAYS);

    const [contracts, software] = await Promise.all([
      this.prisma.contract.findMany(),
      this.prisma.softwareProduct.findMany(),
    ]);

    const contractItems = contracts
      .filter(c => c.renewalDate && c.renewalDate >= today && c.renewalDate <= cutoff)
      .map(c => ({
        name: c.name,
        type: 'Contract',
        renewalDate: c.renewalDate!.toISOString().split('T')[0],
        cost: c.annualCost ? (c.annualCost as any).toNumber() : 0,
        recommendedAction: c.recommendedAction ?? null,
        approvalStatus: c.approvalStatus as string,
      }));

    const softwareItems = software
      .filter(s => s.renewalDate && s.renewalDate >= today && s.renewalDate <= cutoff)
      .map(s => ({
        name: s.name,
        type: 'Software',
        renewalDate: s.renewalDate!.toISOString().split('T')[0],
        cost: s.annualCost ? (s.annualCost as any).toNumber() : 0,
        recommendedAction: s.recommendedAction ?? null,
        approvalStatus: null,
      }));

    const upcomingRenewals = [...contractItems, ...softwareItems].sort((a, b) =>
      a.renewalDate.localeCompare(b.renewalDate),
    );

    const cancellationDeadlines = contracts
      .map(c => {
        let deadline: Date | null = null;
        if (c.cancellationDeadlineOverride) {
          deadline = c.cancellationDeadlineOverride;
        } else if (c.renewalDate && c.noticePeriodDays) {
          deadline = new Date(c.renewalDate.getTime() - c.noticePeriodDays * MS_PER_DAY);
        }
        return { c, deadline };
      })
      .filter(({ deadline }) => deadline && deadline >= today && deadline <= cutoff)
      .map(({ c, deadline }) => ({
        name: c.name,
        deadline: deadline!.toISOString().split('T')[0],
        renewalDate: c.renewalDate ? c.renewalDate.toISOString().split('T')[0] : '',
        cost: c.annualCost ? (c.annualCost as any).toNumber() : 0,
      }))
      .sort((a, b) => a.deadline.localeCompare(b.deadline));

    return { upcomingRenewals, cancellationDeadlines };
  }

  async getCapitalReplacement(): Promise<CapitalReplacementReport> {
    const today = new Date();
    const settings = await this.getFiscalSettings();
    const currentFY = this.currentFiscalYear(settings.fiscalYearStartMonth, today);

    const assets = await this.prisma.hardwareAsset.findMany({
      include: { location: true, department: true },
    });

    const activeAssets = assets.filter(
      a => a.lifecycleStatus !== 'retired' && a.lifecycleStatus !== 'disposed',
    );

    const yearMap = new Map<number, typeof activeAssets>();
    for (let y = currentFY; y <= currentFY + 6; y++) yearMap.set(y, []);

    for (const a of activeAssets) {
      const replacementYear =
        a.replacementYearOverride ??
        (a.purchaseDate && a.usefulLifeYears
          ? a.purchaseDate.getUTCFullYear() + a.usefulLifeYears
          : null);
      if (replacementYear !== null && yearMap.has(replacementYear)) {
        yearMap.get(replacementYear)!.push(a);
      }
    }

    const byYear = Array.from(yearMap.entries())
      .filter(([, arr]) => arr.length > 0)
      .map(([fiscalYear, arr]) => ({
        fiscalYear,
        assets: arr.map(a => {
          const cost = a.replacementCost ?? a.purchaseCost;
          return {
            name: [a.manufacturer, a.model].filter(Boolean).join(' ') || a.assetTag || a.id,
            assetType: a.assetType as string,
            cost: cost ? (cost as any).toNumber() : 0,
            location: (a as any).location?.name ?? null,
            department: (a as any).department?.name ?? null,
          };
        }),
      }));

    const riskItems = assets
      .filter(a => (a.supportEndDate && a.supportEndDate < today) || (a.warrantyEndDate && a.warrantyEndDate < today))
      .map(a => ({
        name: [a.manufacturer, a.model].filter(Boolean).join(' ') || a.assetTag || a.id,
        assetTag: a.assetTag ?? null,
        criticality: a.criticality as string,
        supportEndDate: a.supportEndDate ? a.supportEndDate.toISOString().split('T')[0] : null,
        warrantyEndDate: a.warrantyEndDate ? a.warrantyEndDate.toISOString().split('T')[0] : null,
      }));

    return { byYear, riskItems };
  }

  async getSoftwareOptimization(): Promise<SoftwareOptimizationReport> {
    const today = new Date();
    const software = await this.prisma.softwareProduct.findMany();

    const lowUtilization = software
      .filter(
        s =>
          s.qtyPurchased &&
          s.qtyPurchased > 0 &&
          s.qtyActivelyUsed !== null &&
          s.qtyActivelyUsed !== undefined &&
          s.status !== 'terminated',
      )
      .map(s => {
        const utilizationRate = s.qtyActivelyUsed! / s.qtyPurchased!;
        const annualCost = s.annualCost ? (s.annualCost as any).toNumber() : 0;
        const unusedLicenses = s.qtyPurchased! - s.qtyActivelyUsed!;
        const unitCost = s.unitCost
          ? (s.unitCost as any).toNumber()
          : s.qtyPurchased
          ? annualCost / s.qtyPurchased
          : 0;
        const potentialSavings = unusedLicenses * unitCost;
        return {
          name: s.name,
          utilizationRate,
          qtPurchased: s.qtyPurchased!,
          qtUsed: s.qtyActivelyUsed!,
          annualCost,
          potentialSavings,
        };
      })
      .filter(s => s.utilizationRate < 0.70)
      .sort((a, b) => b.potentialSavings - a.potentialSavings);

    const terminationCandidates = software
      .map(s => ({ s, rec: computeRecommendation('software_product', s, today) }))
      .filter(({ rec }) => rec.recommendedAction === 'terminate' || rec.recommendedAction === 'retire')
      .map(({ s, rec }) => ({
        name: s.name,
        annualCost: s.annualCost ? (s.annualCost as any).toNumber() : 0,
        action: rec.recommendedAction,
        score: rec.score,
      }))
      .sort((a, b) => b.score - a.score);

    return { lowUtilization, terminationCandidates };
  }
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/api
npx jest --testPathPattern="reports.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6: Create `apps/api/src/modules/reports/reports.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('executive-budget')
  getExecutiveBudget() {
    return this.service.getExecutiveBudget();
  }

  @Get('renewal-review')
  getRenewalReview() {
    return this.service.getRenewalReview();
  }

  @Get('capital-replacement')
  getCapitalReplacement() {
    return this.service.getCapitalReplacement();
  }

  @Get('software-optimization')
  getSoftwareOptimization() {
    return this.service.getSoftwareOptimization();
  }
}
```

- [ ] **Step 7: Create `apps/api/src/modules/reports/reports.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
```

- [ ] **Step 8: Register `ReportsModule` in `apps/api/src/app.module.ts`**

Add the import:
```typescript
import { ReportsModule } from './modules/reports/reports.module';
```

Add `ReportsModule` to the `imports` array after `RecommendationsModule`:
```typescript
RecommendationsModule,
ReportsModule,
```

- [ ] **Step 9: Run full test suite**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: all tests pass (baseline count + new report tests).

- [ ] **Step 10: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b
git add apps/api/src/modules/reports/ apps/api/src/app.module.ts
git commit -m "feat: add ReportsModule with 4-endpoint API and TDD (20 tests)"
```

---

## Task 4: CSV Utility + Frontend Server Actions

**Files:**
- Create: `apps/web/lib/utils/csv.ts`
- Create: `apps/web/lib/actions/reports.ts`

- [ ] **Step 1: Create `apps/web/lib/utils/csv.ts`**

```typescript
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const headerLine = headers.length > 0 ? [headers.map(escape).join(',')] : [];
  const lines = [...headerLine, ...rows.map(row => row.map(escape).join(','))];
  return lines.join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Create `apps/web/lib/actions/reports.ts`**

```typescript
'use server';

import { apiServer } from '@/lib/api';
import type {
  ExecutiveBudgetReport,
  RenewalReviewReport,
  CapitalReplacementReport,
  SoftwareOptimizationReport,
} from '@lifecycleiq/shared';

export async function getExecutiveBudgetReport(): Promise<ExecutiveBudgetReport> {
  return apiServer('/api/v1/reports/executive-budget');
}

export async function getRenewalReviewReport(): Promise<RenewalReviewReport> {
  return apiServer('/api/v1/reports/renewal-review');
}

export async function getCapitalReplacementReport(): Promise<CapitalReplacementReport> {
  return apiServer('/api/v1/reports/capital-replacement');
}

export async function getSoftwareOptimizationReport(): Promise<SoftwareOptimizationReport> {
  return apiServer('/api/v1/reports/software-optimization');
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/web
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b
git add apps/web/lib/utils/csv.ts apps/web/lib/actions/reports.ts
git commit -m "feat: add CSV utility and report server actions"
```

---

## Task 5: Reports Landing Page

**Files:**
- Rewrite: `apps/web/app/(protected)/reports/page.tsx`

- [ ] **Step 1: Rewrite `apps/web/app/(protected)/reports/page.tsx`**

```typescript
import Link from 'next/link';

const REPORTS = [
  {
    href: '/reports/executive-budget',
    title: 'Executive Budget Summary',
    description: 'Current-year OpEx/CapEx, 7-year forecast totals, top renewals, capital replacements, and high-priority recommendations.',
  },
  {
    href: '/reports/renewal-review',
    title: 'Renewal Review',
    description: 'Software and contract renewals due in the next 120 days, with cancellation deadlines and recommended actions.',
  },
  {
    href: '/reports/capital-replacement',
    title: 'Capital Replacement',
    description: 'Hardware assets grouped by replacement fiscal year, plus assets with expired warranty or support.',
  },
  {
    href: '/reports/software-optimization',
    title: 'Software Optimization',
    description: 'Low-utilization products with savings estimates, and software flagged as termination or retirement candidates.',
  },
];

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Live data previews — each report exports to CSV.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-slate-400 hover:shadow-sm transition"
          >
            <h2 className="text-base font-semibold text-gray-900">{r.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{r.description}</p>
            <span className="mt-3 inline-block text-sm font-medium text-slate-700">
              View report →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b
git add apps/web/app/(protected)/reports/page.tsx
git commit -m "feat: rewrite reports landing page as navigation hub"
```

---

## Task 6: Executive Budget + Renewal Review Pages

**Files:**
- Create: `apps/web/app/(protected)/reports/executive-budget/page.tsx`
- Create: `apps/web/app/(protected)/reports/executive-budget/client.tsx`
- Create: `apps/web/app/(protected)/reports/renewal-review/page.tsx`
- Create: `apps/web/app/(protected)/reports/renewal-review/client.tsx`

- [ ] **Step 1: Create `apps/web/app/(protected)/reports/executive-budget/page.tsx`**

```typescript
import { getExecutiveBudgetReport } from '@/lib/actions/reports';
import { ExecutiveBudgetClient } from './client';

export default async function ExecutiveBudgetPage() {
  const report = await getExecutiveBudgetReport();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Executive Budget Summary</h1>
          <p className="mt-1 text-sm text-gray-500">Current-year forecast, top renewals, and priority recommendations.</p>
        </div>
      </div>
      <ExecutiveBudgetClient report={report} />
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(protected)/reports/executive-budget/client.tsx`**

```typescript
'use client';

import type { ExecutiveBudgetReport } from '@lifecycleiq/shared';
import { toCsv, downloadCsv } from '@/lib/utils/csv';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

interface Props { report: ExecutiveBudgetReport }

export function ExecutiveBudgetClient({ report }: Props) {
  function handleDownload() {
    const rows: (string | number | null)[][] = [
      ['Metric', 'Value'],
      ['Current Year OpEx', report.currentYearOpex],
      ['Current Year CapEx', report.currentYearCapex],
      ['3-Year Total', report.threeYearTotal],
      ['7-Year Total', report.sevenYearTotal],
      ['Spike Years', report.spikeYears.join(', ') || 'None'],
      [],
      ['Top Renewals (within 120 days)', '', '', ''],
      ['Name', 'Type', 'Renewal Date', 'Annual Cost'],
      ...report.topRenewals.map(r => [r.name, r.type, r.renewalDate ?? '', r.cost]),
      [],
      ['Top Capital Replacements', '', '', ''],
      ['Name', 'Asset Type', 'Replacement Year', 'Cost'],
      ...report.topCapitalReplacements.map(r => [r.name, r.assetType, r.replacementYear ?? '', r.cost]),
      [],
      ['Savings Opportunities', '', '', ''],
      ['Name', 'Annual Cost', 'Utilization %', 'Potential Savings'],
      ...report.savingsOpportunities.map(s => [s.name, s.annualCost, `${Math.round(s.utilizationRate * 100)}%`, s.potentialSavings]),
      [],
      ['High Priority Recommendations', '', '', ''],
      ['Name', 'Type', 'Action', 'Score', 'Classification'],
      ...report.highPriorityRecommendations.map(r => [r.name, r.entityType, r.action, r.score, r.classification]),
    ];
    const csv = toCsv([], rows);
    downloadCsv(`executive-budget-${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-700"
        >
          ↓ Download CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Current Year OpEx', value: fmt(report.currentYearOpex) },
          { label: 'Current Year CapEx', value: fmt(report.currentYearCapex) },
          { label: '3-Year Total', value: fmt(report.threeYearTotal) },
          { label: '7-Year Total', value: fmt(report.sevenYearTotal) },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-xl font-semibold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {report.spikeYears.length > 0 && (
        <p className="text-sm text-red-600">⚠ Budget spike years: {report.spikeYears.join(', ')}</p>
      )}

      {/* Top Renewals */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Top Renewals (Next 120 Days)</h2>
        {report.topRenewals.length === 0 ? (
          <p className="text-sm text-gray-500">No renewals due in the next 120 days.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Renewal Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.topRenewals.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.type}</td>
                  <td className="px-4 py-3 text-gray-500">{r.renewalDate ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Top Capital Replacements */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Top Capital Replacements</h2>
        {report.topCapitalReplacements.length === 0 ? (
          <p className="text-sm text-gray-500">No capital replacements in the 7-year window.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Asset</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Replacement FY</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.topCapitalReplacements.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.assetType}</td>
                  <td className="px-4 py-3 text-gray-500">{r.replacementYear ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Savings Opportunities */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Savings Opportunities</h2>
        {report.savingsOpportunities.length === 0 ? (
          <p className="text-sm text-gray-500">No low-utilization software found.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Utilization</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Potential Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.savingsOpportunities.map((s, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{Math.round(s.utilizationRate * 100)}%</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(s.annualCost)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(s.potentialSavings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* High Priority Recommendations */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">High Priority Recommendations</h2>
        {report.highPriorityRecommendations.length === 0 ? (
          <p className="text-sm text-gray-500">No high-priority items.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Score</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.highPriorityRecommendations.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.entityType.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-500">{r.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{r.score}</td>
                  <td className="px-4 py-3 text-gray-500">{r.classification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(protected)/reports/renewal-review/page.tsx`**

```typescript
import { getRenewalReviewReport } from '@/lib/actions/reports';
import { RenewalReviewClient } from './client';

export default async function RenewalReviewPage() {
  const report = await getRenewalReviewReport();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Renewal Review</h1>
        <p className="mt-1 text-sm text-gray-500">Software and contract renewals due within 120 days, with cancellation deadlines.</p>
      </div>
      <RenewalReviewClient report={report} />
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/app/(protected)/reports/renewal-review/client.tsx`**

```typescript
'use client';

import type { RenewalReviewReport } from '@lifecycleiq/shared';
import { toCsv, downloadCsv } from '@/lib/utils/csv';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

interface Props { report: RenewalReviewReport }

export function RenewalReviewClient({ report }: Props) {
  function handleDownload() {
    const rows: (string | number | null)[][] = [
      ['Upcoming Renewals'],
      ['Name', 'Type', 'Renewal Date', 'Annual Cost', 'Recommended Action', 'Approval Status'],
      ...report.upcomingRenewals.map(r => [r.name, r.type, r.renewalDate, r.cost, r.recommendedAction ?? '', r.approvalStatus ?? '']),
      [],
      ['Cancellation Deadlines'],
      ['Name', 'Deadline', 'Renewal Date', 'Annual Cost'],
      ...report.cancellationDeadlines.map(d => [d.name, d.deadline, d.renewalDate, d.cost]),
    ];
    downloadCsv(`renewal-review-${new Date().toISOString().split('T')[0]}.csv`, toCsv([], rows));
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-700"
        >
          ↓ Download CSV
        </button>
      </div>

      {/* Upcoming Renewals */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Upcoming Renewals ({report.upcomingRenewals.length})
        </h2>
        {report.upcomingRenewals.length === 0 ? (
          <p className="text-sm text-gray-500">No renewals due in the next 120 days.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Renewal Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.upcomingRenewals.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.type}</td>
                  <td className="px-4 py-3 text-gray-500">{r.renewalDate}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(r.cost)}</td>
                  <td className="px-4 py-3 text-gray-500">{r.recommendedAction?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.approvalStatus?.replace(/_/g, ' ') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Cancellation Deadlines */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Cancellation Deadlines ({report.cancellationDeadlines.length})
        </h2>
        {report.cancellationDeadlines.length === 0 ? (
          <p className="text-sm text-gray-500">No cancellation deadlines within 120 days.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Deadline</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Renewal Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.cancellationDeadlines.map((d, i) => (
                <tr key={i} className="bg-yellow-50">
                  <td className="px-4 py-3 text-gray-900">{d.name}</td>
                  <td className="px-4 py-3 font-medium text-yellow-700">{d.deadline}</td>
                  <td className="px-4 py-3 text-gray-500">{d.renewalDate || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(d.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/web
npx tsc --noEmit 2>&1 | head -20
```

Fix any errors before proceeding.

- [ ] **Step 6: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b
git add apps/web/app/(protected)/reports/executive-budget/ \
        apps/web/app/(protected)/reports/renewal-review/
git commit -m "feat: add Executive Budget and Renewal Review report pages"
```

---

## Task 7: Capital Replacement + Software Optimization Pages + Final Checks

**Files:**
- Create: `apps/web/app/(protected)/reports/capital-replacement/page.tsx`
- Create: `apps/web/app/(protected)/reports/capital-replacement/client.tsx`
- Create: `apps/web/app/(protected)/reports/software-optimization/page.tsx`
- Create: `apps/web/app/(protected)/reports/software-optimization/client.tsx`

- [ ] **Step 1: Create `apps/web/app/(protected)/reports/capital-replacement/page.tsx`**

```typescript
import { getCapitalReplacementReport } from '@/lib/actions/reports';
import { CapitalReplacementClient } from './client';

export default async function CapitalReplacementPage() {
  const report = await getCapitalReplacementReport();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Capital Replacement</h1>
        <p className="mt-1 text-sm text-gray-500">Hardware assets by replacement fiscal year, plus unsupported and out-of-warranty items.</p>
      </div>
      <CapitalReplacementClient report={report} />
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(protected)/reports/capital-replacement/client.tsx`**

```typescript
'use client';

import type { CapitalReplacementReport } from '@lifecycleiq/shared';
import { toCsv, downloadCsv } from '@/lib/utils/csv';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

interface Props { report: CapitalReplacementReport }

export function CapitalReplacementClient({ report }: Props) {
  function handleDownload() {
    const rows: (string | number | null)[][] = [
      ['Capital Replacement by Fiscal Year'],
      ['Fiscal Year', 'Asset', 'Type', 'Cost', 'Location', 'Department'],
    ];
    for (const group of report.byYear) {
      for (const a of group.assets) {
        rows.push([group.fiscalYear, a.name, a.assetType, a.cost, a.location ?? '', a.department ?? '']);
      }
    }
    rows.push([]);
    rows.push(['Risk Items (Expired Warranty or Support)']);
    rows.push(['Asset', 'Tag', 'Criticality', 'Support End', 'Warranty End']);
    for (const r of report.riskItems) {
      rows.push([r.name, r.assetTag ?? '', r.criticality, r.supportEndDate ?? '', r.warrantyEndDate ?? '']);
    }
    downloadCsv(`capital-replacement-${new Date().toISOString().split('T')[0]}.csv`, toCsv([], rows));
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-700"
        >
          ↓ Download CSV
        </button>
      </div>

      {/* By Year */}
      {report.byYear.length === 0 ? (
        <p className="text-sm text-gray-500">No capital replacements scheduled in the next 7 fiscal years.</p>
      ) : (
        report.byYear.map((group) => (
          <section key={group.fiscalYear}>
            <h2 className="text-base font-semibold text-gray-900 mb-3">FY{group.fiscalYear}</h2>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Asset</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Location</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.assets.map((a, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-gray-500">{a.assetType}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(a.cost)}</td>
                    <td className="px-4 py-3 text-gray-500">{a.location ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.department ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}

      {/* Risk Items */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Risk Items — Expired Warranty or Support ({report.riskItems.length})
        </h2>
        {report.riskItems.length === 0 ? (
          <p className="text-sm text-gray-500">No assets with expired warranty or support.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Asset</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tag</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Criticality</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Support End</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Warranty End</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.riskItems.map((r, i) => (
                <tr key={i} className={r.criticality === 'mission_critical' ? 'bg-red-50' : ''}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.assetTag ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.criticality.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-gray-500">{r.supportEndDate ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.warrantyEndDate ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(protected)/reports/software-optimization/page.tsx`**

```typescript
import { getSoftwareOptimizationReport } from '@/lib/actions/reports';
import { SoftwareOptimizationClient } from './client';

export default async function SoftwareOptimizationPage() {
  const report = await getSoftwareOptimizationReport();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Software Optimization</h1>
        <p className="mt-1 text-sm text-gray-500">Low-utilization products with savings estimates and termination candidates.</p>
      </div>
      <SoftwareOptimizationClient report={report} />
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/web/app/(protected)/reports/software-optimization/client.tsx`**

```typescript
'use client';

import type { SoftwareOptimizationReport } from '@lifecycleiq/shared';
import { toCsv, downloadCsv } from '@/lib/utils/csv';

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

interface Props { report: SoftwareOptimizationReport }

export function SoftwareOptimizationClient({ report }: Props) {
  function handleDownload() {
    const rows: (string | number | null)[][] = [
      ['Low Utilization Products'],
      ['Product', 'Utilization %', 'Purchased', 'Used', 'Annual Cost', 'Potential Savings'],
      ...report.lowUtilization.map(s => [
        s.name,
        `${Math.round(s.utilizationRate * 100)}%`,
        s.qtPurchased,
        s.qtUsed,
        s.annualCost,
        s.potentialSavings,
      ]),
      [],
      ['Termination Candidates'],
      ['Product', 'Annual Cost', 'Recommended Action', 'Priority Score'],
      ...report.terminationCandidates.map(t => [t.name, t.annualCost, t.action.replace(/_/g, ' '), t.score]),
    ];
    downloadCsv(`software-optimization-${new Date().toISOString().split('T')[0]}.csv`, toCsv([], rows));
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md hover:bg-slate-700"
        >
          ↓ Download CSV
        </button>
      </div>

      {/* Low Utilization */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Low Utilization Products ({report.lowUtilization.length})
        </h2>
        {report.lowUtilization.length === 0 ? (
          <p className="text-sm text-gray-500">No low-utilization software found (threshold: &lt;70%).</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Utilization</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Purchased</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Used</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Potential Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.lowUtilization.map((s, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-right text-orange-600 font-medium">
                    {Math.round(s.utilizationRate * 100)}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{s.qtPurchased}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{s.qtUsed}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(s.annualCost)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(s.potentialSavings)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Termination Candidates */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Termination Candidates ({report.terminationCandidates.length})
        </h2>
        {report.terminationCandidates.length === 0 ? (
          <p className="text-sm text-gray-500">No termination candidates identified.</p>
        ) : (
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Cost</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recommended Action</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Priority Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.terminationCandidates.map((t, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(t.annualCost)}</td>
                  <td className="px-4 py-3 text-gray-500">{t.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{t.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Run full TypeScript check on web**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/web
npx tsc --noEmit 2>&1 | head -30
```

Fix any errors before proceeding.

- [ ] **Step 6: Run full API test suite**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b/apps/api
npx jest --no-coverage 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b
git add apps/web/app/(protected)/reports/capital-replacement/ \
        apps/web/app/(protected)/reports/software-optimization/
git commit -m "feat: add Capital Replacement and Software Optimization report pages"
```

- [ ] **Step 8: Final summary commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-5b
git add -A
git commit -m "chore: Phase 5b complete — reports module" --allow-empty
```
