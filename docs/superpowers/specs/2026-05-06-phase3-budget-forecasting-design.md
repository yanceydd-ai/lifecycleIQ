# LifecycleIQ Phase 3 — Budget Forecasting

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a 7-year OpEx/CapEx budget forecast computed on the fly from existing asset, software, and contract data, with fiscal year settings, escalation, spike detection, a budget roadmap chart, and a fiscal year settings page.

**Phase context:** Phase 1 delivered auth and reference data. Phase 2a delivered hardware/software/contract CRUD with computed fields. Phase 2b added CSV import/export. Phase 3 adds the budget intelligence layer on top of that data.

---

## 1. Scope

### In scope
- New `FiscalYearSettings` Prisma model (singleton, one row per org)
- New `annualMaintenanceCost` field on `HardwareAsset`
- Supabase migration for both schema changes
- `BudgetModule` (NestJS) with `GET /budget/forecast`, `GET /budget/settings`, `PUT /budget/settings`
- Pure `computeForecast` function (TDD) — no DB writes, fully testable
- Spike detection: year flagged when total > rolling average of prior years × 1.30
- `/budget` page rebuilt: stacked bar chart (Recharts) + year-by-year breakdown table
- `/settings/fiscal-year` page: form to edit fiscalYearStartMonth and defaultEscalationRate
- Sidebar link for /settings/fiscal-year (under Settings)
- Shared types for `ForecastYear` and `FiscalYearSettings` in `@lifecycleiq/shared`

### Out of scope
- Per-department or per-asset escalation overrides (single org-wide rate only)
- Budget item persistence (`budget_items` table) — compute on the fly only
- Scenario planning (Phase 5)
- PDF/XLSX export of budget (Phase 5)
- Historical actuals vs. forecast comparison (future phase)

---

## 2. Data Model

### New Prisma model: `FiscalYearSettings`

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

A single row is seeded on first `GET /budget/settings` if none exists (fiscalYearStartMonth=1, defaultEscalationRate=0.03).

### Modified model: `HardwareAsset`

Add one optional field:
```prisma
annualMaintenanceCost  Decimal?  @map("annual_maintenance_cost") @db.Decimal(12, 2)
```

This field captures the recurring annual OpEx for keeping an asset running (e.g. support contracts, licenses tied to hardware). Optional — defaults to zero contribution if null.

---

## 3. API

### Module structure

```
apps/api/src/modules/budget/
  budget.service.ts           — computeForecast pure function + DB access methods
  budget.service.spec.ts      — TDD tests for computeForecast and service methods
  budget.controller.ts        — GET /budget/forecast, GET /budget/settings, PUT /budget/settings
  budget.module.ts            — registers service and controller
  dto/
    update-fiscal-year-settings.dto.ts
```

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/budget/forecast` | Any authenticated | Returns 7-year projection (override with `?years=N`) |
| `GET` | `/budget/settings` | Any authenticated | Returns current FiscalYearSettings (creates default if missing) |
| `PUT` | `/budget/settings` | Admin only | Updates fiscalYearStartMonth and/or defaultEscalationRate |

### Response shape: `GET /budget/forecast`

```typescript
interface ForecastYear {
  fiscalYear: number;
  capex: number;
  opex: number;
  total: number;
  isSpike: boolean;
  breakdown: {
    hardwareReplacement: number;  // CapEx
    hardwareMaintenance: number;  // OpEx — annualMaintenanceCost escalated
    software: number;             // OpEx — software annualCost escalated
    contracts: number;            // OpEx — contract annualCost escalated
  };
}

// Response: ForecastYear[]
```

---

## 4. Forecast Computation

### Exported pure function

```typescript
export function computeForecast(
  assets: HardwareAsset[],
  softwareProducts: SoftwareProduct[],
  contracts: Contract[],
  settings: { fiscalYearStartMonth: number; defaultEscalationRate: number },
  years: number,
  today: Date,
): ForecastYear[]
```

This function has no side effects and no DB access — it receives pre-fetched data and returns the projection. It is fully unit-testable without Prisma mocks.

### Fiscal year logic

The **current fiscal year** is the calendar year in which the current fiscal year started. If `fiscalYearStartMonth = 4` (April) and today is 2026-05-06, the current fiscal year started 2026-04-01, so `currentFiscalYear = 2026`. If today were 2026-02-15 (before April), the current fiscal year would be 2025.

Fiscal year Y covers: `[fiscalYearStartMonth/1/Y, fiscalYearStartMonth/1/(Y+1))`.

### Per-year cost rules

For each forecast year Y with offset `O = Y - currentFiscalYear` (O ≥ 0):

**Hardware Replacement (CapEx):**
- For each HardwareAsset where `replacementYear === Y` and `lifecycleStatus !== 'retired'` and `lifecycleStatus !== 'disposed'`:
  - Contribute `Decimal(replacementCost ?? purchaseCost ?? 0).toNumber()`
  - Not escalated — the stored value is already a future estimate

**Hardware Maintenance (OpEx):**
- For each HardwareAsset where `lifecycleStatus` is NOT `retired` AND NOT `disposed` AND NOT `ordered` AND NOT `planned`:
  - Contribute `annualMaintenanceCost.toNumber() * (1 + rate)^O` if `annualMaintenanceCost` is non-null and > 0

**Software (OpEx):**
- For each SoftwareProduct where `status !== 'terminated'` and `status !== 'replaced'`:
  - Contribute `annualCost.toNumber() * (1 + rate)^O` if `annualCost` is non-null

**Contracts (OpEx):**
- For each Contract where `endDate` is null OR `endDate >= startOfFiscalYear(Y)`:
  - Contribute `annualCost.toNumber() * (1 + rate)^O` if `annualCost` is non-null

Where `startOfFiscalYear(Y)` = `new Date(Y, fiscalYearStartMonth - 1, 1)`.

### Spike detection

A year at index `i` (0-based) is a spike if:
- `i > 0` (no prior years to compare against for the first year)
- `rollingAvg = mean(total[0..i-1])`
- `total[i] > rollingAvg * 1.30`

If `i === 0`, `isSpike = false`.

### Precision

All monetary accumulations use JavaScript `number` (float64). Rounding is applied at display time, not during computation. Prisma `Decimal` fields are converted via `.toNumber()` before computation.

---

## 5. Frontend

### `/budget` — Budget Roadmap Page

Replace the current placeholder with:

**Header row:** "Budget Roadmap" title + "Edit fiscal year settings →" link.

**Stacked bar chart (Recharts `BarChart`):**
- X-axis: fiscal year labels (e.g. "FY2026")
- Y-axis: dollar amount (formatted as $0K, $100K, $1M)
- Two stacked bars per year: CapEx (orange `#f97316`) + OpEx (blue `#3b82f6`)
- Spike years: red dashed border on bar or red dot above bar
- Legend: CapEx / OpEx / ⚠ Spike

**Breakdown table below chart:**
| Fiscal Year | HW Replacement | HW Maintenance | Software | Contracts | Total | |
| FY2026 | $X | $X | $X | $X | $X | |
| FY2027 | $X | $X | $X | $X | $X | ⚠ Spike |

Currency formatted as `$X,XXX` (no decimals in table).

**Data flow:** `page.tsx` (server component) fetches `GET /budget/forecast` and `GET /budget/settings`, passes to `BudgetClient` (client component for chart interactivity).

### `/settings/fiscal-year` — Fiscal Year Settings Page

Simple server component + client component (same pattern as departments):

Fields:
- **Fiscal Year Start Month** — `<select>` with 12 month options (January–December)
- **Default Escalation Rate** — `<input type="number" step="0.1" min="0" max="50">` displayed as percentage (e.g., user enters "3" meaning 3%, stored as 0.03)

Save calls `PUT /budget/settings`. Show current values on load via `GET /budget/settings`.

**Sidebar update:** Add "Fiscal Year" link under Settings in the sidebar navigation.

---

## 6. Shared Types

Add to `packages/shared/src/types/`:

```typescript
// budget.ts
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

Export from `packages/shared/src/index.ts`.

---

## 7. Testing

**`budget.service.spec.ts`** — unit tests for `computeForecast`:
- Returns 7 years by default
- Hardware replacement cost appears only in the correct fiscal year
- Hardware maintenance is escalated by offset years
- Software OpEx excluded for terminated products
- Contract excluded when endDate is before the fiscal year
- Spike flagged when year exceeds rolling avg × 1.30
- No spike on first year regardless of amount
- Escalation formula: cost × (1 + rate)^offset

**`budget.service.spec.ts`** — service method tests:
- `getSettings` creates default row when none exists
- `updateSettings` persists new values
- `getForecast` returns array of ForecastYear from DB data

---

## 8. File Summary

| File | Action |
|------|--------|
| `apps/api/prisma/schema.prisma` | Modify — add `FiscalYearSettings` model, add `annualMaintenanceCost` to `HardwareAsset` |
| `apps/api/prisma/migrations/` | Create — Supabase migration SQL |
| `apps/api/src/modules/budget/budget.service.ts` | Create |
| `apps/api/src/modules/budget/budget.service.spec.ts` | Create |
| `apps/api/src/modules/budget/budget.controller.ts` | Create |
| `apps/api/src/modules/budget/budget.module.ts` | Create |
| `apps/api/src/modules/budget/dto/update-fiscal-year-settings.dto.ts` | Create |
| `apps/api/src/app.module.ts` | Modify — register BudgetModule |
| `apps/api/prisma/seed.ts` | Modify — seed FiscalYearSettings row |
| `packages/shared/src/types/budget.ts` | Create |
| `packages/shared/src/index.ts` | Modify — export budget types |
| `apps/web/app/(protected)/budget/page.tsx` | Rewrite |
| `apps/web/app/(protected)/budget/client.tsx` | Create |
| `apps/web/app/(protected)/settings/fiscal-year/page.tsx` | Create |
| `apps/web/app/(protected)/settings/fiscal-year/client.tsx` | Create |
| `apps/web/lib/actions/budget.ts` | Create |
| `apps/web/components/layout/sidebar.tsx` | Modify — add Fiscal Year under Settings |
