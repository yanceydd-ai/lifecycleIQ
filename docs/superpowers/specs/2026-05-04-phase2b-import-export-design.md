# LifecycleIQ Phase 2b — CSV Import / Export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add CSV import and export to the three Phase 2a modules (Hardware Assets, Software Products, Contracts) with a dry-run preview before committing imports.

**Phase context:** Phase 2a delivered CRUD modules with computed fields. Phase 2b adds bulk data operations. Phase 3 adds fiscal year configuration and budget forecasting.

---

## 1. Scope

### In scope
- NestJS `CsvService` for CSV parsing and serialization
- Import endpoints on all three modules: dry-run preview + confirm
- Export endpoints on all three modules: CSV download with computed fields
- Downloadable CSV templates for each module (static files served from the web app)
- `/imports` page rebuilt with module selector, template download, file upload, preview table, confirm flow
- "Download CSV" button added to each module's list page (`/hardware-assets`, `/software-products`, `/contracts`)
- New server actions in `apps/web/lib/actions/` for import and export

### Out of scope
- XLSX format (CSV only)
- Field mapping UI (fixed column templates only)
- Filtered exports (exports all records, no filter params in v1)
- Upsert on import (duplicate unique fields are flagged as errors, not overwritten)
- Import for Phase 1 entities (departments, locations, vendors — deferred)

---

## 2. Architecture

### Backend (NestJS)

```
apps/api/src/modules/import-export/
  csv.service.ts           — pure parse/serialize functions, no DB access
  csv.service.spec.ts      — unit tests for all CSV logic
  import-export.module.ts  — exports CsvService for use by other modules
```

Each of the three CRUD modules gains two new controller endpoints:

```
POST /hardware-assets/import          → dry-run: parse + validate, return preview
POST /hardware-assets/import/confirm  → commit valid rows in a Prisma transaction
GET  /hardware-assets/export          → stream CSV response

POST /software-products/import
POST /software-products/import/confirm
GET  /software-products/export

POST /contracts/import
POST /contracts/import/confirm
GET  /contracts/export
```

**Libraries:**
- `multer` — file upload handling (already bundled with `@nestjs/platform-express`)
- `papaparse` — CSV parsing server-side (install: `pnpm add papaparse && pnpm add -D @types/papaparse @types/multer`)

**Role guards:**
- `POST /*/import` and `POST /*/import/confirm` — `@Roles(Role.Admin, Role.Editor)`
- `GET /*/export` — `@Roles(Role.Admin, Role.Editor, Role.Viewer)` (read-only is fine)

### Frontend (Next.js)

```
apps/web/app/(protected)/imports/page.tsx     — rebuilt import hub
apps/web/app/(protected)/imports/client.tsx   — upload widget, preview table, confirm

apps/web/lib/actions/import-export.ts         — server actions for all modules
apps/web/public/templates/
  hardware-assets-template.csv
  software-products-template.csv
  contracts-template.csv
```

Export buttons are added to existing client components:
- `apps/web/app/(protected)/hardware-assets/client.tsx`
- `apps/web/app/(protected)/software-products/client.tsx`
- `apps/web/app/(protected)/contracts/client.tsx`

---

## 3. CSV Templates

Templates are static CSV files served from `/public/templates/`. The first row is a comment row (prefixed with `#`) listing valid enum values for reference. The second row is the header row. Users fill in data from row three onward.

### hardware-assets-template.csv

```
# assetType: laptop|desktop|server|vm|network_equipment|printer|mobile_device|storage|peripheral|other
# lifecycleStatus: planned|ordered|active|spare|in_repair|due_for_replacement|deferred|retired|disposed
# criticality: low|medium|high|mission_critical
# fundingType: opex|capex  (optional)
assetTag,assetType,lifecycleStatus,criticality,manufacturer,model,serialNumber,purchaseDate,usefulLifeYears,purchaseCost,warrantyEndDate,supportEndDate,notes
HW-001,laptop,active,medium,Dell,Latitude 7420,SN12345,2022-01-15,4,1200.00,2025-01-15,,
```

Required columns: `assetTag`, `assetType`, `lifecycleStatus`, `criticality`
Optional columns: `manufacturer`, `model`, `serialNumber`, `purchaseDate` (YYYY-MM-DD), `usefulLifeYears` (integer), `purchaseCost` (decimal), `warrantyEndDate` (YYYY-MM-DD), `supportEndDate` (YYYY-MM-DD), `notes`

### software-products-template.csv

```
# licenseModel: per_user|per_device|site_license|fte_based|concurrent_user|consumption_based|flat_annual|multi_year_agreement|other
# status: active|trial|under_review|renewal_pending|sunset_planned|replaced|terminated
# recommendedAction: keep|reduce|eliminate|renegotiate|consolidate|migrate (optional)
name,licenseModel,qtyPurchased,qtyActivelyUsed,unitCost,annualCost,renewalDate,status,notes
Microsoft 365,per_user,50,42,15.00,9000.00,2026-12-31,active,
```

Required columns: `name`, `licenseModel`
Optional columns: `qtyPurchased` (integer), `qtyActivelyUsed` (integer), `unitCost` (decimal), `annualCost` (decimal), `renewalDate` (YYYY-MM-DD), `status`, `recommendedAction`, `notes`

### contracts-template.csv

```
# contractType: software_subscription|saas_agreement|enterprise_agreement|maintenance|support|hardware_lease|professional_services|other
# approvalStatus: not_reviewed|approved|flagged|cancelled
# autoRenewal: true|false
name,contractType,endDate,noticePeriodDays,autoRenewal,annualCost,approvalStatus,notes
Microsoft EA,enterprise_agreement,2026-12-31,60,false,9000.00,approved,
```

Required columns: `name`, `contractType`
Optional columns: `endDate` (YYYY-MM-DD), `noticePeriodDays` (integer), `autoRenewal` (true/false), `annualCost` (decimal), `approvalStatus`, `notes`

---

## 4. Import Flow

### Step 1: Dry-run (`POST /hardware-assets/import`)

Accepts `multipart/form-data` with a single `file` field (CSV).

1. Parse CSV with papaparse (`header: true`, `skipEmptyLines: true`)
2. Skip rows beginning with `#` (comment rows from the template)
3. Validate each row against the module's create DTO using class-validator
4. Return:

```typescript
interface ImportPreview {
  totalRows: number;
  validRows: Record<string, string>[];   // parsed row data, ready to commit
  invalidRows: InvalidRow[];
}

interface InvalidRow {
  rowNumber: number;                     // 1-indexed (excluding header and comment rows)
  data: Record<string, string>;          // original row values
  errors: string[];                      // e.g. ["criticality: must be one of low, medium, high, mission_critical"]
}
```

No database writes occur during this step.

### Step 2: Confirm (`POST /hardware-assets/import/confirm`)

Accepts `{ rows: Record<string, string>[] }` — the `validRows` array from the preview response.

1. Re-validate each row (defense against tampered payloads)
2. Call the module's `service.create()` for each row inside a single `prisma.$transaction()`
3. If the transaction fails, roll back all rows and return a 500 with the error
4. Return `{ imported: number }`

### Validation rules

- Missing required field → error: `"fieldName: required"`
- Invalid enum value → error: `"fieldName: must be one of <values>"`
- Invalid date format (not YYYY-MM-DD) → error: `"fieldName: must be a valid date (YYYY-MM-DD)"`
- Non-numeric value for numeric field → error: `"fieldName: must be a number"`
- Duplicate `assetTag` (hardware) — checked against DB → error: `"assetTag: already exists"`
- `autoRenewal` accepts `"true"` or `"false"` (case-insensitive) → coerce to boolean

Error rows are skipped. Valid rows proceed to import regardless of how many errors exist.

---

## 5. Export Flow

`GET /hardware-assets/export` responds with:

```
Content-Type: text/csv
Content-Disposition: attachment; filename="hardware-assets-2026-05-04.csv"
```

Body: CSV string with header row, one data row per record. Columns include all base fields plus computed fields (`replacementYear`, `warrantyExpired`, `unsupported`, `highRisk` for hardware assets; `utilizationRate`, `unusedLicenses`, `potentialSavings`, `lowUtilization` for software products; `cancellationDeadline`, `daysUntilRenewal`, `urgency` for contracts).

Computed fields are included to make exports useful as snapshots and reports. The export is not intended to be re-imported as-is (computed columns would be ignored on import).

The filename includes today's date (`YYYY-MM-DD`) generated server-side.

---

## 6. Frontend — Import Page (`/imports`)

The existing placeholder is replaced with a three-step flow:

**Step 1 — Select module + download template**
- Dropdown: Hardware Assets / Software Products / Contracts
- Link: "↓ Download template CSV" (links to `/templates/<module>-template.csv`)

**Step 2 — Upload**
- Drag-and-drop zone + "Choose file" button
- On file selection, call `importDryRun(module, file)` server action
- Show loading state while request is in flight

**Step 3 — Preview + Confirm** (shown after dry-run response)
- Summary badges: "N valid" (green) / "N errors" (red)
- Table with all rows, color-coded:
  - Valid rows: green background, "✓ Valid" status
  - Error rows: red background, error message(s) in status column
- "Import N records" button (disabled if 0 valid rows)
- Clicking confirm calls `importConfirm(module, validRows)` → shows success toast with count

**State resets** after a successful import (user can import again).

---

## 7. Frontend — Export Button on List Pages

Each list page client component gains a "Download CSV" button in the page header:

```tsx
<button onClick={handleExport} disabled={exporting} className="...">
  {exporting ? 'Downloading…' : '↓ Download CSV'}
</button>
```

`handleExport`:
1. Calls `exportRecords(module)` server action
2. Server action fetches `GET /api/v1/<module>/export` and returns the CSV string
3. Client creates a `Blob`, generates an object URL, programmatically clicks a hidden `<a>` to trigger download, then revokes the URL

---

## 8. CsvService

Located at `apps/api/src/modules/import-export/csv.service.ts`. Exported as a provider from `ImportExportModule`, imported by each of the three CRUD modules.

```typescript
export class CsvService {
  parse(csvString: string): Record<string, string>[] {
    // papaparse, header: true, skipEmptyLines: true
    // filter out comment rows (starting with #)
  }

  serialize<T extends object>(records: T[], columns: (keyof T)[]): string {
    // header row + data rows joined by \n
    // values containing commas or newlines are quoted
  }
}
```

Both methods are pure (no dependencies, no DB access) and fully unit-testable.

---

## 9. Testing

**`csv.service.spec.ts`** — unit tests:
- `parse` handles comment rows, empty lines, quoted values
- `parse` returns empty array for header-only CSV
- `serialize` produces correct header and data rows
- `serialize` quotes values containing commas

**`hardware-assets.service.spec.ts` additions** (and equivalent for other modules):
- `importPreview` returns valid and invalid rows correctly
- `importPreview` flags missing required field
- `importPreview` flags invalid enum value
- `importConfirm` calls `create` for each valid row inside a transaction
- `exportCsv` returns a string with correct headers and computed fields

---

## 10. File Summary

| File | Action |
|------|--------|
| `apps/api/src/modules/import-export/csv.service.ts` | Create |
| `apps/api/src/modules/import-export/csv.service.spec.ts` | Create |
| `apps/api/src/modules/import-export/import-export.module.ts` | Create |
| `apps/api/src/modules/hardware-assets/hardware-assets.service.ts` | Modify (add importPreview, importConfirm, exportCsv methods) |
| `apps/api/src/modules/hardware-assets/hardware-assets.controller.ts` | Modify (add import/export endpoints) |
| `apps/api/src/modules/software-products/software-products.service.ts` | Modify |
| `apps/api/src/modules/software-products/software-products.controller.ts` | Modify |
| `apps/api/src/modules/contracts/contracts.service.ts` | Modify |
| `apps/api/src/modules/contracts/contracts.controller.ts` | Modify |
| `apps/api/src/app.module.ts` | Modify (import ImportExportModule) |
| `apps/web/app/(protected)/imports/page.tsx` | Rewrite |
| `apps/web/app/(protected)/imports/client.tsx` | Create |
| `apps/web/lib/actions/import-export.ts` | Create |
| `apps/web/app/(protected)/hardware-assets/client.tsx` | Modify (add export button) |
| `apps/web/app/(protected)/software-products/client.tsx` | Modify (add export button) |
| `apps/web/app/(protected)/contracts/client.tsx` | Modify (add export button) |
| `apps/web/public/templates/hardware-assets-template.csv` | Create |
| `apps/web/public/templates/software-products-template.csv` | Create |
| `apps/web/public/templates/contracts-template.csv` | Create |
