# Phase 5b: Reports — Design Spec

**Phase:** 5b  
**Goal:** Add four live-preview executive report pages with CSV export to the LifecycleIQ MVP.

---

## Overview

Phase 5a delivered scenario planning. Phase 5b completes the MVP by building the reporting module: four data-driven report pages that pull from existing data, render a live table preview, and offer a one-click CSV download.

The `/reports` placeholder page (currently "Coming in Phase 5") is replaced with a navigation hub linking to four sub-pages.

---

## Reports Included

| Report | Route |
|--------|-------|
| Executive Budget Summary | `/reports/executive-budget` |
| Renewal Review | `/reports/renewal-review` |
| Capital Replacement | `/reports/capital-replacement` |
| Software Optimization | `/reports/software-optimization` |

No filters for MVP. All data displayed unfiltered. Filters deferred to a future iteration.

---

## Architecture

### Approach: ReportsModule on the API (Approach A)

Report data requires joining across 4–5 tables. This logic belongs in a tested NestJS service, not in frontend server actions. Each report is an API endpoint that returns typed JSON. The frontend renders the preview and generates the CSV from that JSON.

### Backend: `ReportsModule`

**Location:** `apps/api/src/modules/reports/`

**Files:**
- `reports.service.ts` — aggregates data from Prisma for each report
- `reports.service.spec.ts` — TDD tests with mock Prisma
- `reports.controller.ts` — four GET endpoints, JWT-guarded, read-only
- `reports.module.ts` — declares controller and service

**Endpoints:**

| Method | Path | Returns |
|--------|------|---------|
| GET | `/v1/reports/executive-budget` | `ExecutiveBudgetReport` |
| GET | `/v1/reports/renewal-review` | `RenewalReviewReport` |
| GET | `/v1/reports/capital-replacement` | `CapitalReplacementReport` |
| GET | `/v1/reports/software-optimization` | `SoftwareOptimizationReport` |

All four endpoints are accessible to any authenticated user (no role gate beyond JWT). Read-only — no mutations.

`ReportsService` imports `computeForecast` from `budget.service.ts` for forecast numbers rather than re-implementing the logic.

**Registered in:** `apps/api/src/app.module.ts`

---

## Shared Types

**File:** `packages/shared/src/types/reports.ts`  
**Exported from:** `packages/shared/src/index.ts`

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

---

## Report Data Sources

### Executive Budget Summary

Aggregated from:
- `computeForecast` (budget service) → current year OpEx/CapEx, 3-year and 7-year totals, spike years
- `contracts` + `software_products` → top 10 upcoming renewals (by cost, renewal date within 120 days, ordered by cost desc)
- `hardware_assets` → top 10 capital replacements (active assets with replacement year in next 7 fiscal years, ordered by cost desc)
- `software_products` with utilization < 0.70 → savings opportunities (potentialSavings = unused_licenses × unit_cost)
- `recommendations` where score >= 70, ordered by score desc, top 10 → high-priority recommendations. The `name` field requires joining to the related record (hardware asset `assetTag`/`model`, software product `name`, or contract `contractName`) since `recommendations` only stores `relatedRecordId` + `relatedRecordType`.

### Renewal Review

- `contracts` where `renewalDate` is within 120 days, ordered by renewal date asc
- `contracts` where `cancellationDeadline` is within 120 days, ordered by deadline asc
- `software_products` where `renewalDate` within 120 days can also appear in upcoming renewals (type = "Software")
- `recommendedAction` joined from `recommendations` for each contract/software row where available

### Capital Replacement

- `hardware_assets` where `lifecycleStatus` not in (`retired`, `disposed`), grouped by replacement year (calculated or override), for years in current fiscal year through current + 6
- Risk items: `hardware_assets` where `supportEndDate < today` OR `warrantyEndDate < today`, ordered by criticality desc

### Software Optimization

- `software_products` where `status` = `active` and utilization rate < 0.70 (requires `quantityPurchased > 0`), ordered by potential savings desc
- Termination candidates: `recommendations` where `recommendedAction` in (`terminate`, `retire`) joined to `software_products`, ordered by score desc

---

## Frontend Structure

### CSV Utility

**File:** `apps/web/lib/utils/csv.ts`

```typescript
export function toCsv(headers: string[], rows: (string | number | null)[][]): string
export function downloadCsv(filename: string, csv: string): void
```

Extracted as a standalone utility used by all four client components. The existing Phase 2b download pattern (manual CSV string construction) is refactored into this shared function.

### Server Actions

**File:** `apps/web/lib/actions/reports.ts`

Four functions:
- `getExecutiveBudgetReport(): Promise<ExecutiveBudgetReport>`
- `getRenewalReviewReport(): Promise<RenewalReviewReport>`
- `getCapitalReplacementReport(): Promise<CapitalReplacementReport>`
- `getSoftwareOptimizationReport(): Promise<SoftwareOptimizationReport>`

Each calls `apiServer()` to the corresponding API endpoint.

### Routes

| File | Purpose |
|------|---------|
| `app/(protected)/reports/page.tsx` | Navigation hub — 4 report cards |
| `app/(protected)/reports/executive-budget/page.tsx` | Server component, fetches data |
| `app/(protected)/reports/executive-budget/client.tsx` | Preview tables + Download CSV |
| `app/(protected)/reports/renewal-review/page.tsx` | Server component |
| `app/(protected)/reports/renewal-review/client.tsx` | Preview tables + Download CSV |
| `app/(protected)/reports/capital-replacement/page.tsx` | Server component |
| `app/(protected)/reports/capital-replacement/client.tsx` | Preview tables + Download CSV |
| `app/(protected)/reports/software-optimization/page.tsx` | Server component |
| `app/(protected)/reports/software-optimization/client.tsx` | Preview tables + Download CSV |

### Page Pattern

Each report page follows the same structure:
1. Server `page.tsx` calls the server action and passes data as props to the client component
2. Client `client.tsx` renders one or more preview tables
3. A **Download CSV** button at the top-right triggers client-side CSV generation and download
4. The CSV filename includes the report name and today's date (e.g. `renewal-review-2026-05-11.csv`)

---

## Testing

`reports.service.spec.ts` covers all four report methods using mock Prisma data. Tests verify:
- Correct filtering (renewal within 120 days, utilization < 0.70, etc.)
- Correct sorting (by cost desc, by date asc, by score desc)
- Edge cases: no assets, no renewals, zero utilization, null costs
- `computeForecast` is called with correct arguments for executive budget numbers

Target: ~12–15 new tests.

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
| `apps/api/src/app.module.ts` | Modify — register ReportsModule |
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
