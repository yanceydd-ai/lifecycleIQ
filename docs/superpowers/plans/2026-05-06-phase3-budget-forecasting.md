# Phase 3: Budget Forecasting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 7-year OpEx/CapEx budget forecast computed on the fly, with fiscal year settings, escalation, spike detection, a Recharts roadmap chart, and a fiscal year settings page.

**Architecture:** A pure `computeForecast` function (no DB access, fully testable) takes pre-fetched assets/software/contracts and returns an array of `ForecastYear` objects. `BudgetService` fetches the data and invokes it. The frontend fetches `GET /budget/forecast` and renders a Recharts stacked bar chart plus a breakdown table. `FiscalYearSettings` is a singleton Prisma model (one row per org, auto-seeded on first read).

**Tech Stack:** NestJS + Prisma 5, class-validator, Recharts (install in apps/web), Next.js 14 App Router server components, `@lifecycleiq/shared` for `ForecastYear`/`FiscalYearSettings` types.

**Worktree:** Set up `feature/phase-3` from `master` at `/Users/david/LifeCycleIQ_Claude` before starting.

---

## File Map

| File | Action |
|------|--------|
| `apps/api/prisma/schema.prisma` | Modify — add `FiscalYearSettings` model + `annualMaintenanceCost` on `HardwareAsset` |
| `apps/api/prisma/migrations/<timestamp>_phase3_budget/migration.sql` | Create |
| `apps/api/src/modules/hardware-assets/dto/create-hardware-asset.dto.ts` | Modify — add `annualMaintenanceCost` |
| `apps/api/src/modules/hardware-assets/hardware-assets.service.ts` | Modify — map `annualMaintenanceCost` in create/update |
| `apps/api/src/modules/budget/budget.service.ts` | Create |
| `apps/api/src/modules/budget/budget.service.spec.ts` | Create |
| `apps/api/src/modules/budget/budget.controller.ts` | Create |
| `apps/api/src/modules/budget/budget.module.ts` | Create |
| `apps/api/src/modules/budget/dto/update-fiscal-year-settings.dto.ts` | Create |
| `apps/api/src/app.module.ts` | Modify — register `BudgetModule` |
| `apps/api/prisma/seed.ts` | Modify — seed `FiscalYearSettings` |
| `packages/shared/src/types/budget.ts` | Create |
| `packages/shared/src/index.ts` | Modify — export budget types |
| `apps/web/lib/actions/budget.ts` | Create |
| `apps/web/app/(protected)/budget/page.tsx` | Rewrite |
| `apps/web/app/(protected)/budget/client.tsx` | Create |
| `apps/web/app/(protected)/settings/fiscal-year/page.tsx` | Create |
| `apps/web/app/(protected)/settings/fiscal-year/client.tsx` | Create |
| `apps/web/components/layout/sidebar.tsx` | Modify — add Fiscal Year Settings link |
| `apps/web/app/(protected)/hardware-assets/client.tsx` | Modify — add annualMaintenanceCost field to form |

---

## Task 1: Worktree Setup + Install Recharts

**Files:** `apps/web/package.json`

- [ ] **Step 1: Pull latest master and create worktree**

```bash
cd /Users/david/LifeCycleIQ_Claude
git pull origin master
git worktree add .worktrees/phase-3 -b feature/phase-3
```

- [ ] **Step 2: Install dependencies in the worktree**

```bash
cd .worktrees/phase-3/apps/api
pnpm install
pnpm db:generate
```

- [ ] **Step 3: Install recharts in apps/web**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/web
pnpm add recharts
```

- [ ] **Step 4: Run baseline tests to confirm clean start**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 118 passed, 118 total`

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3
git add apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "chore: install recharts for budget roadmap chart"
```

---

## Task 2: Prisma Schema + Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_phase3_budget/migration.sql`
- Modify: `apps/api/src/modules/hardware-assets/dto/create-hardware-asset.dto.ts`
- Modify: `apps/api/src/modules/hardware-assets/hardware-assets.service.ts`

- [ ] **Step 1: Add `FiscalYearSettings` model to schema.prisma**

Open `apps/api/prisma/schema.prisma` and add this model at the end (after the `Contract` model):

```prisma
model FiscalYearSettings {
  id                    String   @id @default(uuid())
  fiscalYearStartMonth  Int      @default(1) @map("fiscal_year_start_month")
  defaultEscalationRate Decimal  @default(0.03) @db.Decimal(5, 4) @map("default_escalation_rate")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("fiscal_year_settings")
}
```

- [ ] **Step 2: Add `annualMaintenanceCost` to `HardwareAsset` model**

In `schema.prisma`, find the `HardwareAsset` model. Add this field after `replacementCost`:

```prisma
annualMaintenanceCost   Decimal?        @map("annual_maintenance_cost") @db.Decimal(12, 2)
```

- [ ] **Step 3: Create Supabase migration**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/api
mkdir -p prisma/migrations/20260506000000_phase3_budget
```

Create `apps/api/prisma/migrations/20260506000000_phase3_budget/migration.sql`:

```sql
-- CreateTable: fiscal_year_settings
CREATE TABLE "fiscal_year_settings" (
    "id" TEXT NOT NULL,
    "fiscal_year_start_month" INTEGER NOT NULL DEFAULT 1,
    "default_escalation_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fiscal_year_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable: hardware_assets — add annual_maintenance_cost
ALTER TABLE "hardware_assets" ADD COLUMN "annual_maintenance_cost" DECIMAL(12,2);
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/api
pnpm db:generate
```

Expected: no errors. The generated client now includes `FiscalYearSettings` and `HardwareAsset.annualMaintenanceCost`.

- [ ] **Step 5: Add `annualMaintenanceCost` to the hardware-asset DTO**

Open `apps/api/src/modules/hardware-assets/dto/create-hardware-asset.dto.ts`. Add this field after `replacementCost`:

```typescript
@IsOptional() @IsNumberString()
annualMaintenanceCost?: string;
```

- [ ] **Step 6: Map `annualMaintenanceCost` in the hardware-assets service**

Open `apps/api/src/modules/hardware-assets/hardware-assets.service.ts`. In the `create` method's Prisma `data` block, add after `replacementCost`:

```typescript
annualMaintenanceCost: dto.annualMaintenanceCost !== undefined ? dto.annualMaintenanceCost : undefined,
```

In the `update` method's Prisma `data` block, add after `replacementCost`:

```typescript
annualMaintenanceCost: d.annualMaintenanceCost !== undefined ? d.annualMaintenanceCost : undefined,
```

- [ ] **Step 7: Run existing tests to confirm nothing broke**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 118 passed, 118 total`

- [ ] **Step 8: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3
git add apps/api/prisma/ apps/api/src/modules/hardware-assets/
git commit -m "feat: add FiscalYearSettings model and annualMaintenanceCost to HardwareAsset"
```

---

## Task 3: Shared Types

**Files:**
- Create: `packages/shared/src/types/budget.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/src/types/budget.ts`**

```typescript
export interface ForecastYear {
  fiscalYear: number;
  capex: number;
  opex: number;
  total: number;
  isSpike: boolean;
  breakdown: {
    hardwareReplacement: number;
    hardwareMaintenance: number;
    software: number;
    contracts: number;
  };
}

export interface FiscalYearSettings {
  id: string;
  fiscalYearStartMonth: number;
  defaultEscalationRate: number;
  updatedAt: string;
}

export interface UpdateFiscalYearSettingsInput {
  fiscalYearStartMonth?: number;
  defaultEscalationRate?: number;
}
```

- [ ] **Step 2: Export from `packages/shared/src/index.ts`**

Add this line at the end:

```typescript
export * from './types/budget';
```

- [ ] **Step 3: Verify shared package compiles**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/packages/shared
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3
git add packages/shared/
git commit -m "feat: add ForecastYear, FiscalYearSettings shared types"
```

---

## Task 4: BudgetModule (TDD)

**Files:**
- Create: `apps/api/src/modules/budget/budget.service.spec.ts`
- Create: `apps/api/src/modules/budget/budget.service.ts`
- Create: `apps/api/src/modules/budget/budget.controller.ts`
- Create: `apps/api/src/modules/budget/budget.module.ts`
- Create: `apps/api/src/modules/budget/dto/update-fiscal-year-settings.dto.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write the failing tests first**

Create `apps/api/src/modules/budget/budget.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BudgetService, computeForecast } from './budget.service';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Mock helpers ───────────────────────────────────────────────────────────

function dec(n: number) { return { toNumber: () => n } as any; }

function mockAsset(overrides: any = {}) {
  return {
    id: 'hw-1',
    assetTag: 'HW-001',
    assetType: 'laptop',
    lifecycleStatus: 'active',
    criticality: 'medium',
    purchaseDate: new Date('2020-01-01'),
    usefulLifeYears: 4,
    purchaseCost: dec(1000),
    replacementCost: null,
    replacementYearOverride: null,
    annualMaintenanceCost: null,
    ...overrides,
  };
}

function mockSoftware(overrides: any = {}) {
  return {
    id: 'sw-1',
    name: 'Microsoft 365',
    status: 'active',
    annualCost: dec(9000),
    ...overrides,
  };
}

function mockContract(overrides: any = {}) {
  return {
    id: 'ct-1',
    name: 'Microsoft EA',
    endDate: null,
    annualCost: dec(5000),
    ...overrides,
  };
}

const BASE_SETTINGS = { fiscalYearStartMonth: 1, defaultEscalationRate: 0.03 };
const TODAY = new Date('2026-05-06');

// ─── computeForecast unit tests ──────────────────────────────────────────────

describe('computeForecast', () => {
  it('returns the requested number of years', () => {
    expect(computeForecast([], [], [], BASE_SETTINGS, 7, TODAY)).toHaveLength(7);
  });

  it('starts from current fiscal year (January start, today May 2026)', () => {
    const result = computeForecast([], [], [], BASE_SETTINGS, 1, TODAY);
    expect(result[0].fiscalYear).toBe(2026);
  });

  it('correctly determines FY when today is before fiscal year start month', () => {
    // FY starts April; today is Feb 2026 → current FY is 2025
    const result = computeForecast([], [], [], { fiscalYearStartMonth: 4, defaultEscalationRate: 0 }, 1, new Date('2026-02-01'));
    expect(result[0].fiscalYear).toBe(2025);
  });

  it('places hardware replacement CapEx only in the correct fiscal year', () => {
    const asset = mockAsset({ replacementYearOverride: 2028, purchaseCost: dec(5000) });
    const result = computeForecast([asset], [], [], { ...BASE_SETTINGS, defaultEscalationRate: 0 }, 7, TODAY);
    const y2028 = result.find(y => y.fiscalYear === 2028)!;
    const y2026 = result.find(y => y.fiscalYear === 2026)!;
    expect(y2028.breakdown.hardwareReplacement).toBe(5000);
    expect(y2026.breakdown.hardwareReplacement).toBe(0);
  });

  it('excludes retired assets from hardware replacement', () => {
    const asset = mockAsset({ replacementYearOverride: 2026, lifecycleStatus: 'retired' });
    const result = computeForecast([asset], [], [], BASE_SETTINGS, 1, TODAY);
    expect(result[0].breakdown.hardwareReplacement).toBe(0);
  });

  it('escalates hardware maintenance cost by offset year', () => {
    const asset = mockAsset({ annualMaintenanceCost: dec(1000) });
    const settings = { fiscalYearStartMonth: 1, defaultEscalationRate: 0.10 };
    const result = computeForecast([asset], [], [], settings, 3, TODAY);
    expect(result[0].breakdown.hardwareMaintenance).toBeCloseTo(1000, 1);  // 1000 × 1.10^0
    expect(result[1].breakdown.hardwareMaintenance).toBeCloseTo(1100, 1);  // 1000 × 1.10^1
    expect(result[2].breakdown.hardwareMaintenance).toBeCloseTo(1210, 1);  // 1000 × 1.10^2
  });

  it('excludes terminated software from OpEx', () => {
    const sw = mockSoftware({ status: 'terminated' });
    const result = computeForecast([], [sw], [], BASE_SETTINGS, 1, TODAY);
    expect(result[0].breakdown.software).toBe(0);
  });

  it('excludes contract whose endDate is before the fiscal year start', () => {
    // endDate 2026-03-01 is before FY2027 start (Jan 1 2027) → excluded in 2027
    const contract = mockContract({ endDate: new Date('2026-03-01') });
    const result = computeForecast([], [], [contract], BASE_SETTINGS, 2, TODAY);
    expect(result[0].breakdown.contracts).toBeGreaterThan(0); // included in 2026
    expect(result[1].breakdown.contracts).toBe(0);             // excluded in 2027
  });

  it('flags spike when year total exceeds rolling avg × 1.30', () => {
    // Year 2026: $1000 CapEx; Year 2027: $2000 CapEx → 2027 > 1000 × 1.30
    const asset2026 = mockAsset({ id: 'hw-a', replacementYearOverride: 2026, purchaseCost: dec(1000), annualMaintenanceCost: null });
    const asset2027 = mockAsset({ id: 'hw-b', replacementYearOverride: 2027, purchaseCost: dec(2000), annualMaintenanceCost: null });
    const result = computeForecast([asset2026, asset2027], [], [], { fiscalYearStartMonth: 1, defaultEscalationRate: 0 }, 2, TODAY);
    expect(result[0].isSpike).toBe(false);
    expect(result[1].isSpike).toBe(true);
  });

  it('never flags the first year as a spike', () => {
    const asset = mockAsset({ replacementYearOverride: 2026, purchaseCost: dec(9999999) });
    const result = computeForecast([asset], [], [], BASE_SETTINGS, 1, TODAY);
    expect(result[0].isSpike).toBe(false);
  });
});

// ─── BudgetService unit tests ────────────────────────────────────────────────

const mockPrisma = {
  fiscalYearSettings: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  hardwareAsset: { findMany: jest.fn() },
  softwareProduct: { findMany: jest.fn() },
  contract: { findMany: jest.fn() },
};

const defaultSettingsRow = {
  id: 'fys-1',
  fiscalYearStartMonth: 1,
  defaultEscalationRate: { toNumber: () => 0.03 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BudgetService', () => {
  let service: BudgetService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<BudgetService>(BudgetService);
  });

  describe('getSettings', () => {
    it('returns existing settings row', async () => {
      mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(defaultSettingsRow);
      const result = await service.getSettings();
      expect(result.fiscalYearStartMonth).toBe(1);
    });

    it('creates default settings when none exists', async () => {
      mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(null);
      mockPrisma.fiscalYearSettings.create.mockResolvedValue(defaultSettingsRow);
      await service.getSettings();
      expect(mockPrisma.fiscalYearSettings.create).toHaveBeenCalledWith({
        data: { fiscalYearStartMonth: 1, defaultEscalationRate: 0.03 },
      });
    });
  });

  describe('updateSettings', () => {
    it('updates the existing settings row and returns result', async () => {
      mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(defaultSettingsRow);
      const updated = { ...defaultSettingsRow, fiscalYearStartMonth: 4 };
      mockPrisma.fiscalYearSettings.update.mockResolvedValue(updated);
      const result = await service.updateSettings({ fiscalYearStartMonth: 4 });
      expect(result.fiscalYearStartMonth).toBe(4);
      expect(mockPrisma.fiscalYearSettings.update).toHaveBeenCalledWith({
        where: { id: 'fys-1' },
        data: { fiscalYearStartMonth: 4, defaultEscalationRate: undefined },
      });
    });
  });

  describe('getForecast', () => {
    it('returns an array of ForecastYear with the requested length', async () => {
      mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(defaultSettingsRow);
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([]);
      mockPrisma.softwareProduct.findMany.mockResolvedValue([]);
      mockPrisma.contract.findMany.mockResolvedValue([]);
      const result = await service.getForecast(5);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(5);
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/api
npx jest --testPathPattern="budget.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: FAIL — "Cannot find module './budget.service'"

- [ ] **Step 3: Create the DTO**

Create `apps/api/src/modules/budget/dto/update-fiscal-year-settings.dto.ts`:

```typescript
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateFiscalYearSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStartMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultEscalationRate?: number;
}
```

- [ ] **Step 4: Create `budget.service.ts`**

Create `apps/api/src/modules/budget/budget.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { HardwareAsset, SoftwareProduct, Contract } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateFiscalYearSettingsDto } from './dto/update-fiscal-year-settings.dto';
import { ForecastYear } from '@lifecycleiq/shared';

export function computeForecast(
  assets: HardwareAsset[],
  softwareProducts: SoftwareProduct[],
  contracts: Contract[],
  settings: { fiscalYearStartMonth: number; defaultEscalationRate: number },
  years: number,
  today: Date,
): ForecastYear[] {
  const { fiscalYearStartMonth } = settings;
  const rate = Number(settings.defaultEscalationRate);

  // Current fiscal year: the calendar year in which the FY started
  const currentFiscalYear =
    today.getMonth() + 1 >= fiscalYearStartMonth
      ? today.getFullYear()
      : today.getFullYear() - 1;

  const EXCLUDED_FROM_MAINTENANCE = ['retired', 'disposed', 'ordered', 'planned'];

  const result: ForecastYear[] = [];

  for (let i = 0; i < years; i++) {
    const fiscalYear = currentFiscalYear + i;
    const escalation = Math.pow(1 + rate, i);
    const fyStart = new Date(fiscalYear, fiscalYearStartMonth - 1, 1);

    // Hardware Replacement (CapEx) — not escalated
    let hardwareReplacement = 0;
    for (const asset of assets) {
      const replacementYear =
        asset.replacementYearOverride !== null && asset.replacementYearOverride !== undefined
          ? asset.replacementYearOverride
          : asset.purchaseDate && asset.usefulLifeYears
          ? new Date(asset.purchaseDate).getUTCFullYear() + asset.usefulLifeYears
          : null;

      if (
        replacementYear === fiscalYear &&
        asset.lifecycleStatus !== 'retired' &&
        asset.lifecycleStatus !== 'disposed'
      ) {
        const cost = asset.replacementCost ?? asset.purchaseCost;
        if (cost) hardwareReplacement += (cost as any).toNumber();
      }
    }

    // Hardware Maintenance (OpEx) — escalated
    let hardwareMaintenance = 0;
    for (const asset of assets) {
      if (!EXCLUDED_FROM_MAINTENANCE.includes(asset.lifecycleStatus) && (asset as any).annualMaintenanceCost) {
        hardwareMaintenance += (asset as any).annualMaintenanceCost.toNumber() * escalation;
      }
    }

    // Software (OpEx) — escalated
    let software = 0;
    for (const product of softwareProducts) {
      if (product.status !== 'terminated' && product.status !== 'replaced' && product.annualCost) {
        software += (product.annualCost as any).toNumber() * escalation;
      }
    }

    // Contracts (OpEx) — escalated
    let contractsTotal = 0;
    for (const contract of contracts) {
      const isActive = !contract.endDate || contract.endDate >= fyStart;
      if (isActive && contract.annualCost) {
        contractsTotal += (contract.annualCost as any).toNumber() * escalation;
      }
    }

    const capex = hardwareReplacement;
    const opex = hardwareMaintenance + software + contractsTotal;

    result.push({
      fiscalYear,
      capex,
      opex,
      total: capex + opex,
      isSpike: false,
      breakdown: { hardwareReplacement, hardwareMaintenance, software, contracts: contractsTotal },
    });
  }

  // Spike detection — compare each year against rolling average of prior years
  for (let i = 1; i < result.length; i++) {
    const priorTotals = result.slice(0, i).map(y => y.total);
    const rollingAvg = priorTotals.reduce((s, t) => s + t, 0) / priorTotals.length;
    result[i].isSpike = result[i].total > rollingAvg * 1.30;
  }

  return result;
}

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.fiscalYearSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.fiscalYearSettings.create({
        data: { fiscalYearStartMonth: 1, defaultEscalationRate: 0.03 },
      });
    }
    return settings;
  }

  async updateSettings(dto: UpdateFiscalYearSettingsDto) {
    const existing = await this.getSettings();
    return this.prisma.fiscalYearSettings.update({
      where: { id: existing.id },
      data: {
        fiscalYearStartMonth: dto.fiscalYearStartMonth,
        defaultEscalationRate: dto.defaultEscalationRate,
      },
    });
  }

  async getForecast(years: number): Promise<ForecastYear[]> {
    const settings = await this.getSettings();
    const [assets, softwareProducts, contracts] = await Promise.all([
      this.prisma.hardwareAsset.findMany(),
      this.prisma.softwareProduct.findMany(),
      this.prisma.contract.findMany(),
    ]);

    return computeForecast(
      assets,
      softwareProducts,
      contracts,
      {
        fiscalYearStartMonth: settings.fiscalYearStartMonth,
        defaultEscalationRate: Number(settings.defaultEscalationRate),
      },
      years,
      new Date(),
    );
  }
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/api
npx jest --testPathPattern="budget.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: ~12 tests passing (9 computeForecast + 3 service)

- [ ] **Step 6: Create `budget.controller.ts`**

Create `apps/api/src/modules/budget/budget.controller.ts`:

```typescript
import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { Role } from '@lifecycleiq/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { BudgetService } from './budget.service';
import { UpdateFiscalYearSettingsDto } from './dto/update-fiscal-year-settings.dto';

@Controller('budget')
export class BudgetController {
  constructor(private service: BudgetService) {}

  @Get('forecast')
  getForecast(@Query('years') years?: string) {
    return this.service.getForecast(years ? parseInt(years, 10) : 7);
  }

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @Roles(Role.Admin)
  updateSettings(@Body() dto: UpdateFiscalYearSettingsDto) {
    return this.service.updateSettings(dto);
  }
}
```

- [ ] **Step 7: Create `budget.module.ts`**

Create `apps/api/src/modules/budget/budget.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';

@Module({
  controllers: [BudgetController],
  providers: [BudgetService],
})
export class BudgetModule {}
```

- [ ] **Step 8: Register BudgetModule in AppModule**

Open `apps/api/src/app.module.ts`. Add the import:

```typescript
import { BudgetModule } from './modules/budget/budget.module';
```

Add `BudgetModule` to the `imports` array after `ContractsModule`.

- [ ] **Step 9: Run full test suite**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/api
npx jest --no-coverage 2>&1 | tail -5
```

Expected: all tests pass (118 original + ~12 new budget tests)

- [ ] **Step 10: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3
git add apps/api/src/modules/budget/ apps/api/src/app.module.ts
git commit -m "feat: add BudgetModule with computeForecast TDD (12 tests)"
```

---

## Task 5: Seed FiscalYearSettings

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Read `apps/api/prisma/seed.ts`** to understand the existing upsert pattern.

- [ ] **Step 2: Add FiscalYearSettings seed**

Add this block at the end of the `main()` function (before the final console.log):

```typescript
// Seed FiscalYearSettings (singleton — upsert by checking if any row exists)
const existingSettings = await prisma.fiscalYearSettings.findFirst();
if (!existingSettings) {
  await prisma.fiscalYearSettings.create({
    data: {
      fiscalYearStartMonth: 1,
      defaultEscalationRate: 0.03,
    },
  });
  console.log('Seeded FiscalYearSettings (Jan, 3% escalation)');
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/api
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3
git add apps/api/prisma/seed.ts
git commit -m "feat: seed FiscalYearSettings with default values"
```

---

## Task 6: Frontend Server Actions

**Files:**
- Create: `apps/web/lib/actions/budget.ts`

- [ ] **Step 1: Create `apps/web/lib/actions/budget.ts`**

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { ForecastYear, FiscalYearSettings, UpdateFiscalYearSettingsInput } from '@lifecycleiq/shared';

export async function getForecast(years = 7): Promise<ForecastYear[]> {
  return apiServer(`/api/v1/budget/forecast?years=${years}`);
}

export async function getBudgetSettings(): Promise<FiscalYearSettings> {
  return apiServer('/api/v1/budget/settings');
}

export async function updateBudgetSettings(
  data: UpdateFiscalYearSettingsInput,
): Promise<FiscalYearSettings> {
  const result = await apiServer<FiscalYearSettings>('/api/v1/budget/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/budget');
  return result;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/web
npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3
git add apps/web/lib/actions/budget.ts
git commit -m "feat: add budget server actions (getForecast, getBudgetSettings, updateBudgetSettings)"
```

---

## Task 7: Fiscal Year Settings Page

**Files:**
- Create: `apps/web/app/(protected)/settings/fiscal-year/page.tsx`
- Create: `apps/web/app/(protected)/settings/fiscal-year/client.tsx`

- [ ] **Step 1: Create `apps/web/app/(protected)/settings/fiscal-year/page.tsx`**

```typescript
import { getBudgetSettings } from '@/lib/actions/budget';
import { FiscalYearClient } from './client';

export default async function FiscalYearPage() {
  const settings = await getBudgetSettings();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Fiscal Year Settings</h1>
      </div>
      <FiscalYearClient initialSettings={settings} />
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(protected)/settings/fiscal-year/client.tsx`**

```typescript
'use client';

import { useState, useTransition } from 'react';
import { updateBudgetSettings } from '@/lib/actions/budget';
import type { FiscalYearSettings } from '@lifecycleiq/shared';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props { initialSettings: FiscalYearSettings }

export function FiscalYearClient({ initialSettings }: Props) {
  const [month, setMonth] = useState(initialSettings.fiscalYearStartMonth);
  const [rate, setRate] = useState(
    (Number(initialSettings.defaultEscalationRate) * 100).toFixed(1),
  );
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateBudgetSettings({
        fiscalYearStartMonth: month,
        defaultEscalationRate: parseFloat(rate) / 100,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fiscal Year Start Month
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="w-full rounded-md border-gray-300 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Escalation Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="50"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full rounded-md border-gray-300 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Annual cost increase applied to future years (e.g. 3 = 3% per year)
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-green-600">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/web
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3
git add apps/web/app/(protected)/settings/fiscal-year/
git commit -m "feat: add fiscal year settings page (/settings/fiscal-year)"
```

---

## Task 8: Budget Roadmap Page

**Files:**
- Rewrite: `apps/web/app/(protected)/budget/page.tsx`
- Create: `apps/web/app/(protected)/budget/client.tsx`

- [ ] **Step 1: Rewrite `apps/web/app/(protected)/budget/page.tsx`**

```typescript
import Link from 'next/link';
import { getForecast } from '@/lib/actions/budget';
import { BudgetClient } from './client';

export default async function BudgetPage() {
  const forecast = await getForecast();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Budget Roadmap</h1>
        <Link
          href="/settings/fiscal-year"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          Edit fiscal year settings →
        </Link>
      </div>
      <BudgetClient forecast={forecast} />
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(protected)/budget/client.tsx`**

```typescript
'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ForecastYear } from '@lifecycleiq/shared';

function formatAxis(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

interface Props { forecast: ForecastYear[] }

export function BudgetClient({ forecast }: Props) {
  const chartData = forecast.map((y) => ({
    name: `FY${y.fiscalYear}`,
    CapEx: Math.round(y.capex),
    OpEx: Math.round(y.opex),
    isSpike: y.isSpike,
  }));

  const hasSpike = forecast.some((y) => y.isSpike);

  return (
    <div className="space-y-8">
      {/* Stacked bar chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11 }} width={72} />
            <Tooltip formatter={(value: number) => formatMoney(value)} />
            <Legend />
            <Bar
              dataKey="CapEx"
              stackId="a"
              fill="#f97316"
              name="CapEx (Replacement)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="OpEx"
              stackId="a"
              fill="#3b82f6"
              name="OpEx (Recurring)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        {hasSpike && (
          <p className="text-xs text-red-600 mt-2">
            ⚠ Spike years exceed 30% above rolling average
          </p>
        )}
      </div>

      {/* Breakdown table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Fiscal Year</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">HW Replacement</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">HW Maintenance</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Software</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Contracts</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {forecast.map((y) => (
              <tr key={y.fiscalYear} className={y.isSpike ? 'bg-red-50' : ''}>
                <td className="px-4 py-3 font-medium text-gray-900">FY{y.fiscalYear}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {formatMoney(y.breakdown.hardwareReplacement)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {formatMoney(y.breakdown.hardwareMaintenance)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {formatMoney(y.breakdown.software)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {formatMoney(y.breakdown.contracts)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {formatMoney(y.total)}
                </td>
                <td className="px-4 py-3">
                  {y.isSpike && (
                    <span className="text-xs text-red-600 font-medium">⚠ Spike</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/web
npx tsc --noEmit 2>&1 | head -20
```

Fix any errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3
git add apps/web/app/(protected)/budget/
git commit -m "feat: add budget roadmap page with Recharts stacked bar chart and breakdown table"
```

---

## Task 9: Sidebar Update + annualMaintenanceCost Form Field + Final Check

**Files:**
- Modify: `apps/web/components/layout/sidebar.tsx`
- Modify: `apps/web/app/(protected)/hardware-assets/client.tsx`

- [ ] **Step 1: Add Fiscal Year Settings link to sidebar**

Open `apps/web/components/layout/sidebar.tsx`.

Add `Calendar` to the lucide-react imports:
```typescript
import {
  LayoutDashboard, CheckSquare, HardDrive, Package, FileText,
  TrendingUp, GitBranch, BarChart2, Upload, Settings, Calendar,
} from 'lucide-react';
```

Add this entry to `navItems` after the Settings entry:
```typescript
{ label: 'Fiscal Year Settings', href: '/settings/fiscal-year', icon: Calendar },
```

- [ ] **Step 2: Add `annualMaintenanceCost` field to the hardware-assets form**

Open `apps/web/app/(protected)/hardware-assets/client.tsx`.

Read the file first to find where the form fields are. Add a `annualMaintenanceCost` state variable after the existing form state variables:

```typescript
const [annualMaintenanceCost, setAnnualMaintenanceCost] = useState('');
```

In `openCreate()`, add:
```typescript
setAnnualMaintenanceCost('');
```

In `openEdit(row)`, add:
```typescript
setAnnualMaintenanceCost((row as any).annualMaintenanceCost?.toString() ?? '');
```

In the `payload` object inside `handleSubmit`, add:
```typescript
annualMaintenanceCost: annualMaintenanceCost || undefined,
```

In the form JSX, add a new field after `usefulLifeYears`:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Annual Maintenance Cost
  </label>
  <input
    type="number"
    step="0.01"
    min="0"
    value={annualMaintenanceCost}
    onChange={(e) => setAnnualMaintenanceCost(e.target.value)}
    className="w-full rounded-md border-gray-300 text-sm"
    placeholder="0.00"
  />
</div>
```

- [ ] **Step 3: Run full TypeScript check on web**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/web
npx tsc --noEmit 2>&1 | head -30
```

Fix any errors.

- [ ] **Step 4: Run full API test suite**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3/apps/api
npx jest --no-coverage 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/david/LifeCycleIQ_Claude/.worktrees/phase-3
git add apps/web/components/layout/sidebar.tsx \
        apps/web/app/(protected)/hardware-assets/client.tsx
git commit -m "feat: add Fiscal Year Settings to sidebar and annualMaintenanceCost to hardware form"
```

- [ ] **Step 6: Final summary commit**

```bash
git add -A
git commit -m "chore: Phase 3 complete — budget forecasting" --allow-empty
```
