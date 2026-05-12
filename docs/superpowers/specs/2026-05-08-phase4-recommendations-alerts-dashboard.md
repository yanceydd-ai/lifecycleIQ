# LifecycleIQ Phase 4 — Recommendations, Alerts, and Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a computed recommendation engine (priority score 0–100, deterministic, explainable), computed alerts (warranty/support/renewal/cancellation deadlines), recommendation overrides with decision history, and a rebuilt dashboard and decisions page that surface all of this.

**Phase context:** Phase 1 delivered auth and reference data. Phase 2a delivered hardware/software/contract CRUD. Phase 2b added CSV import/export. Phase 3 added fiscal year settings and a 7-year OpEx/CapEx budget forecast. Phase 4 adds the intelligence layer on top of that data.

---

## 1. Scope

### In scope
- New `DecisionHistory` Prisma model (one row per recommendation override)
- `recommendedAction` field added to `HardwareAsset` and `Contract` (already exists on `SoftwareProduct`)
- Supabase migration for both schema changes
- `AlertsModule` (NestJS): `GET /alerts`, pure `computeAlerts` function (TDD)
- `RecommendationsModule` (NestJS): `GET /recommendations`, `GET /recommendations/:entityType/:id`, `POST /recommendations/:entityType/:id/override`, `GET /decision-history/:entityType/:id`, pure `computeRecommendation` function (TDD)
- Register both modules in `AppModule`
- Shared types: `Alert`, `Recommendation`, `DecisionHistory`, `UpdateRecommendationInput`
- `/dashboard` page rebuilt: 4 summary cards + upcoming decisions table + budget roadmap chart (reusing Phase 3 `BudgetClient`)
- `/decisions` page rebuilt: tabbed recommendations table with override dialog + decision history
- Server actions: `getAlerts`, `getRecommendations`, `overrideRecommendation`, `getDecisionHistory`

### Out of scope
- Persisted alerts table (alerts are computed on the fly)
- Dedicated `/alerts` frontend page (alerts appear on dashboard only)
- Approval workflows (Phase 5)
- Scenario planning (Phase 5)
- AI-generated explanations (post-MVP)

---

## 2. Data Model

### New Prisma model: `DecisionHistory`

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

One row per override. Immutable after creation — no `updatedAt`.

### Modified models

**`HardwareAsset`** — add:
```prisma
recommendedAction RecommendedAction? @map("recommended_action")
```

**`Contract`** — add:
```prisma
recommendedAction RecommendedAction? @map("recommended_action")
```

`SoftwareProduct` already has `recommendedAction RecommendedAction?` — no change needed.

The `recommendedAction` field on each entity stores the user's most recent override. The computed recommendation always runs fresh from source data. `isOverridden` is true when the stored field differs from what the engine would compute.

---

## 3. Alerts

### Computed — no DB writes

`GET /alerts` scans all hardware assets, software products, and contracts and returns an `Alert[]`. No persistence.

### Alert types

| Alert Type | Source | Trigger |
|---|---|---|
| `warranty_expiring` | `HardwareAsset.warrantyEndDate` | Within 120 days and not null |
| `support_ending` | `HardwareAsset.supportEndDate` | Within 120 days and not null |
| `high_risk_unsupported` | `HardwareAsset` | `supportEndDate` past AND `criticality = mission_critical` |
| `renewal_due` | `SoftwareProduct.renewalDate`, `Contract.renewalDate` | Within 120 days and not null |
| `cancellation_deadline` | `renewalDate − noticePeriodDays` (software/contract) | Within 120 days |
| `auto_renewal_unreviewed` | Software/Contract where `autoRenewal = true` AND `recommendedAction = null` | Always |

### Severity

| Days Until Due | Severity |
|---|---|
| < 30 | `critical` |
| 30–60 | `high` |
| 60–90 | `medium` |
| 90–120 | `low` |

`high_risk_unsupported` and `auto_renewal_unreviewed` are always `critical`.

Assets with `lifecycleStatus` of `retired` or `disposed` are excluded from all alert checks.
Software with `status` of `terminated` or `replaced` is excluded.

### Shared type

```typescript
export interface Alert {
  id: string;              // deterministic: `${entityType}:${entityId}:${alertType}`
  entityType: 'hardware_asset' | 'software_product' | 'contract';
  entityId: string;
  entityName: string;
  alertType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;         // "Dell XPS 15 support ends in 23 days"
  dueDate: string | null;  // ISO date string
  daysUntilDue: number | null;
}
```

### Pure function signature

```typescript
export function computeAlerts(
  assets: HardwareAsset[],
  software: SoftwareProduct[],
  contracts: Contract[],
  today: Date,
): Alert[]
```

### API

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/alerts` | Any authenticated | All active alerts sorted by severity then daysUntilDue |

Query params: `?entityType=hardware_asset`, `?severity=critical`, `?days=90` (limit to items due within N days).

---

## 4. Recommendation Engine

### Computed — no DB writes (except overrides)

`GET /recommendations` always recomputes from live entity data. The stored `recommendedAction` on each entity is the override; `isOverridden` is set when they differ.

### Priority score formula

```
priority_score =
  (criticality_score  × 0.30)
+ (lifecycle_risk     × 0.25)
+ (security_risk      × 0.20)
+ (user_impact        × 0.15)
+ (financial_urgency  × 0.10)
```

All sub-scores are integers 0–100. Result is rounded to the nearest integer.

### Sub-score mappings

#### Hardware Asset

| Sub-score | Mapping |
|---|---|
| `criticality_score` | `low`=25 · `medium`=50 · `high`=75 · `mission_critical`=100 |
| `lifecycle_risk` | `replacementYear ≤ currentYear`→100 · `+1yr`→75 · `+2yr`→50 · else 0 |
| `security_risk` | `supportEndDate` past→100 · `warrantyEndDate` past only→50 · else 0 |
| `user_impact` | `due_for_replacement`→100 · `active`→50 · `spare`→25 · other→0 |
| `financial_urgency` | `replacementCost ?? purchaseCost`: >$10k→100 · >$5k→75 · >$1k→50 · else 25 · null→25 |

#### Software Product

| Sub-score | Mapping |
|---|---|
| `criticality_score` | `riskIfNotRenewed` non-null→75 · else 50 |
| `lifecycle_risk` | Days until `renewalDate`: <30→100 · <60→75 · <90→50 · <120→25 · else 0 · null→0 |
| `security_risk` | `status=sunset_planned`→75 · `replaced`→50 · else 0 |
| `user_impact` | utilization (`qtyActivelyUsed/qtyPurchased`): <0.50→25 · <0.70→50 · ≥0.70→75 · null→50 |
| `financial_urgency` | `annualCost`: >$50k→100 · >$10k→75 · >$1k→50 · else 25 · null→25 |

#### Contract

| Sub-score | Mapping |
|---|---|
| `criticality_score` | 50 (no criticality field) |
| `lifecycle_risk` | Days until `renewalDate ?? endDate`: <30→100 · <60→75 · <90→50 · <120→25 · else 0 · null→0 |
| `security_risk` | `approvalStatus=review_required`→75 · `not_reviewed`→50 · else 0 |
| `user_impact` | 50 (no utilization field) |
| `financial_urgency` | `annualCost`: >$50k→100 · >$10k→75 · >$1k→50 · else 25 · null→25 |

### Score classification

| Score | Classification |
|---|---|
| 85–100 | Must fund |
| 70–84 | Strongly recommended |
| 50–69 | Plan carefully |
| 30–49 | Optional or defer |
| 0–29 | Retirement candidate |

### Recommended action derivation

**Hardware:**
- `security_risk = 100` AND `criticality = mission_critical` → `replace`
- `lifecycle_risk = 100` (replacement year reached) → `replace`
- `lifecycle_risk = 75` (replacement next year) → `monitor`
- `lifecycleStatus = due_for_replacement` → `replace`
- `lifecycleStatus = spare` AND score < 30 → `retire`
- else → `monitor`

**Software:**
- `status = terminated` → `terminate`
- `status = sunset_planned` OR `replaced` → `replace`
- `status = renewal_pending` AND utilization ≥ 0.70 → `renew_as_is`
- `status = renewal_pending` AND utilization < 0.70 → `renew_with_reduction`
- utilization < 0.50 AND `annualCost` non-null → `renew_with_reduction`
- `status = under_review` → `monitor`
- else → `monitor`

**Contract:**
- `lifecycle_risk ≥ 75` AND `annualCost > $10k` → `renegotiate`
- `lifecycle_risk ≥ 50` → `renew_as_is`
- else → `monitor`

### Explanation string

A one-to-two sentence string generated by `computeRecommendation`. Examples:
- Hardware: `"Support ended 6 months ago. As mission-critical hardware with a replacement cost of $12,000, immediate replacement is recommended."`
- Software: `"Only 220 of 500 licenses are actively used (44% utilization). Reducing the license count at renewal could lower annual cost."`
- Contract: `"This $45,000 contract renews in 28 days with auto-renewal enabled and no decision on record."`

### Shared types

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

### Pure function signature

```typescript
export function computeRecommendation(
  entityType: 'hardware_asset' | 'software_product' | 'contract',
  entity: HardwareAssetWithComputed | SoftwareProduct | Contract,
  today: Date,
): Omit<Recommendation, 'isOverridden' | 'overriddenAction'>
```

`HardwareAssetWithComputed` is the type already exported from `hardware-assets.service.ts` (includes computed `replacementYear`).

### API

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/recommendations` | Any authenticated | All recommendations sorted by score desc |
| `GET` | `/recommendations/:entityType/:id` | Any authenticated | Single entity recommendation |
| `POST` | `/recommendations/:entityType/:id/override` | Any authenticated | Override recommendation + create DecisionHistory |
| `GET` | `/decision-history/:entityType/:id` | Any authenticated | Decision history for one entity |

`POST /recommendations/:entityType/:id/override` body: `{ newAction: string, rationale: string }`. The handler:
1. Fetches the entity to get current `recommendedAction` (stored in previousAction)
2. Updates `recommendedAction` on the entity to `newAction`
3. Creates a `DecisionHistory` row
4. Creates an `AuditLog` entry
5. Returns the new `DecisionHistory` row

---

## 5. Module Structure

```
apps/api/src/modules/alerts/
  alerts.service.ts           — computeAlerts pure function + DB fetch methods
  alerts.service.spec.ts      — TDD tests for computeAlerts
  alerts.controller.ts        — GET /alerts
  alerts.module.ts

apps/api/src/modules/recommendations/
  recommendations.service.ts  — computeRecommendation pure function + DB access + override logic
  recommendations.service.spec.ts — TDD tests
  recommendations.controller.ts   — 4 endpoints
  recommendations.module.ts
  dto/
    update-recommendation.dto.ts
```

---

## 6. Frontend

### `/dashboard` — rebuilt

**Data flow:** `page.tsx` (server component) fetches `GET /budget/forecast`, `GET /alerts`, `GET /recommendations` in parallel. Passes all three to `DashboardClient`.

**Layout:**

**Summary cards (4):**
- Current FY OpEx (from forecast year 0)
- Current FY CapEx (from forecast year 0)
- Critical alerts count (severity = `critical`)
- High-priority recommendations count (score ≥ 70)

**Upcoming decisions table:**
Merged list of all `critical`/`high` alerts + recommendations with score ≥ 50, sorted: critical alerts first, then high alerts, then recommendations by score desc. Limited to 15 rows.

Columns: Name · Type (Hardware/Software/Contract) · Issue (alert message or recommendation explanation, truncated to 80 chars) · Urgency (severity badge or score badge) · Due Date · Recommended Action

**Budget roadmap chart:**
Import and reuse `BudgetClient` from `apps/web/app/(protected)/budget/client.tsx`. Pass the same `forecast` array. No duplication of chart logic.

### `/decisions` — rebuilt

**Data flow:** `page.tsx` (server component) fetches `GET /recommendations`. Passes to `DecisionsClient`.

**Layout:**

**Tabs:** All · Hardware · Software · Contracts (filter the same fetched array client-side)

**Table columns:** Name · Score · Classification · Recommended Action · Explanation (truncated, expandable) · Override button

**Override dialog:**
- Dropdown: select new action (RecommendedAction enum values)
- Textarea: rationale (required, min 10 chars)
- On submit: calls `overrideRecommendation` server action → `POST /recommendations/:entityType/:id/override`
- After success: row shows overridden action with a "Overridden" badge; original computed action shown in muted text

**Decision history in dialog:**
Load `GET /decision-history/:entityType/:id` when override dialog opens. Show previous overrides as a timeline at the bottom of the dialog ("2 previous decisions").

### Server actions

```
apps/web/lib/actions/alerts.ts
  getAlerts(params?: { entityType?: string; severity?: string; days?: number }): Promise<Alert[]>

apps/web/lib/actions/recommendations.ts
  getRecommendations(params?: { entityType?: string; minScore?: number }): Promise<Recommendation[]>
  getRecommendation(entityType: string, id: string): Promise<Recommendation>
  overrideRecommendation(entityType: string, id: string, input: UpdateRecommendationInput): Promise<DecisionHistory>
  getDecisionHistory(entityType: string, id: string): Promise<DecisionHistory[]>
```

---

## 7. Testing

### `alerts.service.spec.ts` — unit tests for `computeAlerts`
- Returns empty array when no entities
- Hardware: `warranty_expiring` alert when warrantyEndDate within 120 days
- Hardware: no alert when warrantyEndDate > 120 days out
- Hardware: severity=critical when warrantyEndDate within 29 days
- Hardware: `high_risk_unsupported` when supportEndDate past AND mission_critical
- Hardware: no `high_risk_unsupported` when criticality=high (not mission_critical)
- Hardware: excludes retired/disposed assets
- Software: `cancellation_deadline` computed from renewalDate − noticePeriodDays
- Software: `auto_renewal_unreviewed` when autoRenewal=true and no recommendedAction
- Software: excludes terminated/replaced software
- Contract: `renewal_due` within 60 days → severity=high
- Alert id is deterministic (same entity+type = same id)

### `recommendations.service.spec.ts` — unit tests for `computeRecommendation`
- Hardware: score=100 for mission_critical + past replacement year + unsupported
- Hardware: recommendedAction=replace when replacementYear ≤ currentYear
- Hardware: recommendedAction=monitor when replacement 2+ years out
- Software: lifecycle_risk=100 when renewalDate within 29 days
- Software: user_impact=25 when utilization < 0.50
- Software: recommendedAction=renew_with_reduction when renewal_pending + low utilization
- Contract: security_risk=75 when approvalStatus=review_required
- Contract: recommendedAction=renegotiate when lifecycle_risk≥75 and annualCost > $10k
- Score classification: score=90 → "Must fund"
- Score classification: score=35 → "Optional or defer"

### `recommendations.service.spec.ts` — service method tests
- `overrideRecommendation` creates DecisionHistory row with correct previousAction
- `overrideRecommendation` updates entity's recommendedAction field
- `getDecisionHistory` returns rows for entity sorted by createdAt desc

---

## 8. File Summary

| File | Action |
|---|---|
| `apps/api/prisma/schema.prisma` | Modify — add `DecisionHistory` model, add `recommendedAction` to `HardwareAsset` and `Contract` |
| `apps/api/prisma/migrations/` | Create — Supabase migration SQL |
| `apps/api/src/modules/alerts/alerts.service.ts` | Create |
| `apps/api/src/modules/alerts/alerts.service.spec.ts` | Create |
| `apps/api/src/modules/alerts/alerts.controller.ts` | Create |
| `apps/api/src/modules/alerts/alerts.module.ts` | Create |
| `apps/api/src/modules/recommendations/recommendations.service.ts` | Create |
| `apps/api/src/modules/recommendations/recommendations.service.spec.ts` | Create |
| `apps/api/src/modules/recommendations/recommendations.controller.ts` | Create |
| `apps/api/src/modules/recommendations/recommendations.module.ts` | Create |
| `apps/api/src/modules/recommendations/dto/update-recommendation.dto.ts` | Create |
| `apps/api/src/app.module.ts` | Modify — register AlertsModule and RecommendationsModule |
| `packages/shared/src/types/alert.ts` | Create |
| `packages/shared/src/types/recommendation.ts` | Create |
| `packages/shared/src/index.ts` | Modify — export alert and recommendation types |
| `apps/web/lib/actions/alerts.ts` | Create |
| `apps/web/lib/actions/recommendations.ts` | Create |
| `apps/web/app/(protected)/dashboard/page.tsx` | Rewrite |
| `apps/web/app/(protected)/dashboard/client.tsx` | Create |
| `apps/web/app/(protected)/decisions/page.tsx` | Rewrite |
| `apps/web/app/(protected)/decisions/client.tsx` | Create |
