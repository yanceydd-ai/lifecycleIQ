# LifecycleIQ Phase 5a — Scenario Planning

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add scenario planning — three system presets (Conservative/Expected/Aggressive) plus user-created custom scenarios, each with a custom escalation rate and per-entity overrides (defer year, cost override, exclude), a scenario editor, and a side-by-side comparison against the live baseline forecast.

**Phase context:** Phase 1 delivered auth and reference data. Phase 2a delivered hardware/software/contract CRUD. Phase 2b added CSV import/export. Phase 3 added fiscal year settings and a 7-year OpEx/CapEx budget forecast (`computeForecast`). Phase 4 added alerts, recommendations, dashboard, and decisions. Phase 5a adds scenario planning on top of the existing forecast infrastructure.

---

## 1. Scope

### In scope
- New `Scenario` Prisma model and `ScenarioType` enum
- New `ScenarioOverride` Prisma model (cascade-deletes with scenario)
- Supabase migration
- `ScenariosModule` (NestJS): 8 endpoints + pure `computeScenarioForecast` function (TDD)
- Register in `AppModule`
- Seed 3 system preset scenarios (Conservative, Expected, Aggressive)
- Shared types: `Scenario`, `ScenarioOverride`, `CreateScenarioInput`, `UpsertScenarioOverrideInput`
- `/scenarios` list page (server + client)
- `/scenarios/:id` editor page (server + client)
- `/scenarios/:id/compare` comparison page (server + client)
- Server actions: `getScenarios`, `getScenario`, `createScenario`, `updateScenario`, `deleteScenario`, `getScenarioForecast`, `upsertScenarioOverride`, `deleteScenarioOverride`

### Out of scope
- Reports module (Phase 5b)
- PDF/XLSX export of scenario comparison
- Multi-scenario comparison (comparing 3+ scenarios simultaneously)
- Per-scenario per-user permissions
- Scenario approval workflow

### Baseline definition
The **baseline** is always the live forecast computed from current data via `GET /budget/forecast`. It is not stored as a `Scenario` row. Comparison always pairs one stored scenario against the live baseline.

---

## 2. Data Model

### New enum: `ScenarioType`

```prisma
enum ScenarioType {
  conservative
  expected
  aggressive
  custom
}
```

### New model: `Scenario`

```prisma
model Scenario {
  id             String             @id @default(uuid())
  name           String
  type           ScenarioType
  escalationRate Decimal            @db.Decimal(5, 4) @map("escalation_rate")
  isRecommended  Boolean            @default(false) @map("is_recommended")
  isSystem       Boolean            @default(false) @map("is_system")
  createdBy      String?            @map("created_by")
  createdAt      DateTime           @default(now()) @map("created_at")
  updatedAt      DateTime           @updatedAt @map("updated_at")
  overrides      ScenarioOverride[]

  @@map("scenarios")
}
```

`isSystem = true` for the three seeded presets. System scenarios cannot be deleted.
`createdBy` is a soft reference to the user ID — no FK, following the `AuditLog` and `DecisionHistory` pattern.

### New model: `ScenarioOverride`

```prisma
model ScenarioOverride {
  id           String   @id @default(uuid())
  scenarioId   String   @map("scenario_id")
  scenario     Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
  entityType   String   @map("entity_type")
  entityId     String   @map("entity_id")
  overrideType String   @map("override_type")
  value        String
  createdAt    DateTime @default(now()) @map("created_at")

  @@unique([scenarioId, entityType, entityId, overrideType])
  @@map("scenario_overrides")
}
```

**`entityType`:** `'hardware_asset' | 'software_product' | 'contract'`

**`overrideType` and `value` semantics:**

| overrideType | Entity types | value format | Effect |
|---|---|---|---|
| `defer_year` | hardware_asset | `"2029"` | Sets `replacementYearOverride` to the year |
| `cost` | any | `"45000"` | Overrides `annualCost` (software/contract) or `replacementCost` (hardware) |
| `exclude` | any | `"true"` | Removes entity from forecast computation |

The `@@unique` constraint ensures at most one override of each type per entity per scenario.

---

## 3. Seeded Presets

Three system scenarios are created by `apps/api/prisma/seed.ts` if none exist:

| Name | Type | escalationRate | isSystem |
|---|---|---|---|
| Conservative | `conservative` | 0.0500 | true |
| Expected | `expected` | 0.0300 | true |
| Aggressive | `aggressive` | 0.0100 | true |

These cannot be deleted. Their escalation rates and `isRecommended` flag can be updated by an Admin.

---

## 4. Computation

### Pure function: `computeScenarioForecast`

```typescript
export function computeScenarioForecast(
  assets: HardwareAsset[],
  software: SoftwareProduct[],
  contracts: Contract[],
  settings: { fiscalYearStartMonth: number; defaultEscalationRate: number },
  overrides: ScenarioOverride[],
  scenarioEscalationRate: number,
  years: number,
  today: Date,
): ForecastYear[]
```

No DB access, no side effects. Applies overrides to copies of the entity arrays, then delegates to the existing `computeForecast` function with `scenarioEscalationRate` substituted for `settings.defaultEscalationRate`.

**Override application logic (in order):**

1. Build lookup: group overrides by `${entityType}:${entityId}:${overrideType}`.
2. For each asset: apply `defer_year` (set `replacementYearOverride`), apply `cost` (set `replacementCost`), apply `exclude` (remove from array).
3. For each software product: apply `cost` (set `annualCost`), apply `exclude` (remove from array).
4. For each contract: apply `cost` (set `annualCost`), apply `exclude` (remove from array).
5. Call `computeForecast(modifiedAssets, modifiedSoftware, modifiedContracts, { ...settings, defaultEscalationRate: scenarioEscalationRate }, years, today)`.

Entities are not mutated — copies are made via spread before any field is changed.

---

## 5. API

### Module structure

```
apps/api/src/modules/scenarios/
  scenarios.service.ts           — computeScenarioForecast + CRUD + DB access
  scenarios.service.spec.ts      — TDD tests
  scenarios.controller.ts        — 8 endpoints
  scenarios.module.ts
  dto/
    create-scenario.dto.ts
    update-scenario.dto.ts
    upsert-scenario-override.dto.ts
```

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/scenarios` | Any authenticated | List all scenarios (presets + custom), includes overrides count |
| `POST` | `/scenarios` | Admin, Editor | Create custom scenario |
| `GET` | `/scenarios/:id` | Any authenticated | Single scenario with full overrides array |
| `PUT` | `/scenarios/:id` | Admin, Editor | Update name, escalationRate, isRecommended |
| `DELETE` | `/scenarios/:id` | Admin | Delete custom scenario (400 if `isSystem=true`) |
| `GET` | `/scenarios/:id/forecast` | Any authenticated | Compute scenario forecast → `ForecastYear[]` |
| `PUT` | `/scenarios/:id/overrides` | Admin, Editor | Upsert one override (body: entityType, entityId, overrideType, value) |
| `DELETE` | `/scenarios/:id/overrides/:overrideId` | Admin, Editor | Remove one override |

`DELETE /scenarios/:id` returns `400 Bad Request` with message `"System scenarios cannot be deleted"` when `isSystem=true`.

---

## 6. Shared Types

Add to `packages/shared/src/types/scenario.ts`:

```typescript
export type ScenarioType = 'conservative' | 'expected' | 'aggressive' | 'custom';
export type OverrideType = 'defer_year' | 'cost' | 'exclude';

export interface ScenarioOverride {
  id: string;
  scenarioId: string;
  entityType: 'hardware_asset' | 'software_product' | 'contract';
  entityId: string;
  overrideType: OverrideType;
  value: string;
  createdAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  escalationRate: number;
  isRecommended: boolean;
  isSystem: boolean;
  createdBy: string | null;
  overrides: ScenarioOverride[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateScenarioInput {
  name: string;
  escalationRate: number;
}

export interface UpdateScenarioInput {
  name?: string;
  escalationRate?: number;
  isRecommended?: boolean;
}

export interface UpsertScenarioOverrideInput {
  entityType: 'hardware_asset' | 'software_product' | 'contract';
  entityId: string;
  overrideType: OverrideType;
  value: string;
}
```

Export from `packages/shared/src/index.ts`.

---

## 7. Frontend

### `/scenarios` — Scenarios list page

**Data flow:** `page.tsx` (server component) fetches `GET /scenarios`. Passes to `ScenariosClient`.

**Layout:**
- Header: "Scenarios" + "New Scenario" button (Admin/Editor only — hide for other roles; use session role from NextAuth)
- Card grid (3 columns on desktop): each card shows name, type badge, escalation rate (e.g., "5.0%"), "Recommended" badge if `isRecommended`, override count badge (e.g., "3 overrides"). Two buttons: **Edit** (→ `/scenarios/:id`) and **Compare** (→ `/scenarios/:id/compare`). System cards show a lock icon; no Delete button.
- "New Scenario" opens an inline creation form: name input + escalation rate input (%). On submit calls `createScenario` and navigates to the new scenario editor.

### `/scenarios/:id` — Scenario editor page

**Data flow:** `page.tsx` (server component) fetches `GET /scenarios/:id` (with overrides) + `GET /hardware-assets` + `GET /software-products` + `GET /contracts` in parallel. Passes to `ScenarioEditorClient`.

**Layout:**
- Header: scenario name (editable inline for non-system scenarios) + escalation rate field (%) + "Mark as Recommended" toggle
- Three tabs: **Hardware** / **Software** / **Contracts**
- Each tab shows a table of all entities. Rows with active overrides are highlighted (light teal background).

**Hardware tab columns:** Asset Tag / Name · Status · Replacement Year · Override Year (number input, blank = no override) · Override Cost ($ input, blank = no override) · Exclude (toggle)

**Software tab columns:** Name · Status · Annual Cost · Override Cost ($ input) · Exclude (toggle)

**Contracts tab columns:** Name · Type · Annual Cost · Override Cost ($ input) · Exclude (toggle)

Each override control saves immediately on blur/change via `upsertScenarioOverride` server action (no Save button). Clearing an override input removes the override via `deleteScenarioOverride`.

### `/scenarios/:id/compare` — Comparison page

**Data flow:** `page.tsx` (server component) fetches `GET /budget/forecast` (baseline) and `GET /scenarios/:id/forecast` in parallel. Also fetches `GET /scenarios/:id` for the scenario name. Passes to `ScenarioCompareClient`.

**Layout:**
- Header: "Baseline vs [Scenario Name]" + escalation rate callout (e.g., "Scenario uses 5.0% escalation")
- **Grouped bar chart (Recharts `BarChart`):** Two bars per fiscal year — Baseline (gray `#9ca3af`) and Scenario (teal `#0d9488`). Y-axis formatted as $K/$M. Legend shows Baseline / Scenario.
- **Year-by-year table:**

  | Fiscal Year | Baseline | Scenario | Difference | Diff % |
  |---|---|---|---|---|
  | FY2026 | $X | $X | +$X / -$X | +X% / -X% |

  Positive difference (scenario costs more) shown in red. Negative difference (scenario saves money) shown in green.
- **Summary row:** 7-year cumulative totals + net savings/cost label.

---

## 8. Server Actions

```
apps/web/lib/actions/scenarios.ts
  getScenarios(): Promise<Scenario[]>
  getScenario(id: string): Promise<Scenario>
  createScenario(input: CreateScenarioInput): Promise<Scenario>  — revalidates /scenarios
  updateScenario(id: string, input: UpdateScenarioInput): Promise<Scenario>  — revalidates /scenarios, /scenarios/:id
  deleteScenario(id: string): Promise<void>  — revalidates /scenarios
  getScenarioForecast(id: string): Promise<ForecastYear[]>
  upsertScenarioOverride(id: string, input: UpsertScenarioOverrideInput): Promise<ScenarioOverride>  — revalidates /scenarios/:id
  deleteScenarioOverride(id: string, overrideId: string): Promise<void>  — revalidates /scenarios/:id
```

---

## 9. Testing

### `scenarios.service.spec.ts` — `computeScenarioForecast` unit tests

- Returns same result as `computeForecast` when no overrides and same rate
- `defer_year` override changes asset's replacement year in the computed output
- `cost` override changes hardware replacement cost contribution
- `cost` override changes software annual cost contribution
- `cost` override changes contract annual cost contribution
- `exclude` override removes hardware asset from all forecast years
- `exclude` override removes software product from OpEx
- `exclude` override removes contract from OpEx
- scenarioEscalationRate overrides the settings rate
- Multiple overrides on the same entity apply correctly
- Overrides do not mutate the original entity arrays (immutability check)

### `scenarios.service.spec.ts` — service method tests

- `createScenario` creates a custom scenario
- `deleteScenario` deletes a custom scenario
- `deleteScenario` throws 400 when `isSystem=true`
- `upsertOverride` creates a new override when none exists
- `upsertOverride` updates existing override when same unique key exists
- `deleteOverride` removes the override

---

## 10. File Summary

| File | Action |
|---|---|
| `apps/api/prisma/schema.prisma` | Modify — add `ScenarioType` enum, `Scenario` model, `ScenarioOverride` model |
| `apps/api/prisma/migrations/20260510000000_phase5a_scenarios/migration.sql` | Create |
| `apps/api/src/modules/scenarios/scenarios.service.ts` | Create |
| `apps/api/src/modules/scenarios/scenarios.service.spec.ts` | Create |
| `apps/api/src/modules/scenarios/scenarios.controller.ts` | Create |
| `apps/api/src/modules/scenarios/scenarios.module.ts` | Create |
| `apps/api/src/modules/scenarios/dto/create-scenario.dto.ts` | Create |
| `apps/api/src/modules/scenarios/dto/update-scenario.dto.ts` | Create |
| `apps/api/src/modules/scenarios/dto/upsert-scenario-override.dto.ts` | Create |
| `apps/api/src/app.module.ts` | Modify — register ScenariosModule |
| `apps/api/prisma/seed.ts` | Modify — seed 3 system presets |
| `packages/shared/src/types/scenario.ts` | Create |
| `packages/shared/src/index.ts` | Modify — export scenario types |
| `apps/web/lib/actions/scenarios.ts` | Create |
| `apps/web/app/(protected)/scenarios/page.tsx` | Rewrite |
| `apps/web/app/(protected)/scenarios/client.tsx` | Create |
| `apps/web/app/(protected)/scenarios/[id]/page.tsx` | Create |
| `apps/web/app/(protected)/scenarios/[id]/client.tsx` | Create |
| `apps/web/app/(protected)/scenarios/[id]/compare/page.tsx` | Create |
| `apps/web/app/(protected)/scenarios/[id]/compare/client.tsx` | Create |
