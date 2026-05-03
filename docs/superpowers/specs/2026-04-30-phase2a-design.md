# LifecycleIQ Phase 2a — Hardware, Software & Contracts CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Hardware Asset, Software/SaaS, and Contract CRUD modules to LifecycleIQ, with computed lifecycle fields, urgency indicators, and dedicated top-level navigation sections.

**Phase context:** Phase 1 delivered auth, users, departments, locations, vendors, and audit log. Phase 2a builds the three primary working modules on top of that foundation. Phase 2b (separate spec) will add CSV/XLSX import/export. Phase 3 adds fiscal year config and budget forecasting.

---

## 1. Scope

### In scope
- Prisma schema: three new models (`HardwareAsset`, `SoftwareProduct`, `Contract`) and nine new enums
- Supabase migration for new tables
- NestJS modules with full CRUD, RBAC guards, and audit logging for all three entities
- TDD: unit tests for all service methods
- Computed fields returned in API responses (replacement year, utilization rate, cancellation deadline, urgency flags)
- Next.js pages: list, create (full-page form), and detail/edit for each module
- Sidebar updated with Hardware, Software, Contracts top-level nav entries
- Seed data: representative records for development/demo

### Out of scope (deferred)
- Alert system (Phase 3/4)
- Budget forecast contribution (Phase 3)
- Import/Export (Phase 2b)
- Dashboard widgets (Phase 4)
- Decision history tracking (Phase 4)

---

## 2. Navigation Structure

Updated sidebar order:

```
Dashboard     /dashboard       (placeholder — built in Phase 4)
Hardware      /hardware
Software      /software
Contracts     /contracts
Settings      /settings/...    (existing: departments, locations, vendors, users)
```

---

## 3. Database Schema

### 3.1 New Enums

```prisma
enum AssetType {
  laptop desktop tablet server storage
  network_switch wireless_access_point firewall ups
  printer mfp_copier classroom_display projector
  av_equipment phone camera iot_device other
}

enum LifecycleStatus {
  planned ordered active spare in_repair
  due_for_replacement deferred retired disposed
}

enum Criticality {
  low medium high mission_critical
}

enum FundingType {
  opex capex
}

enum LicenseModel {
  per_user per_device site_license fte_based
  concurrent_user consumption_based flat_annual
  multi_year_agreement other
}

enum SoftwareStatus {
  active trial under_review renewal_pending
  sunset_planned replaced terminated
}

enum RecommendedAction {
  renew_as_is renew_with_reduction expand renegotiate
  replace consolidate terminate monitor escalate
}

enum ContractType {
  software_subscription saas_agreement hardware_support
  maintenance_agreement managed_service telecom
  internet_circuit cloud_service professional_service
  warranty other
}

enum ApprovalStatus {
  not_reviewed review_required pending_quote
  pending_approval approved rejected deferred cancelled
}
```

### 3.2 HardwareAsset Model

```prisma
model HardwareAsset {
  id                      String         @id @default(uuid())
  assetTag                String?        @unique @map("asset_tag")
  assetType               AssetType      @map("asset_type")
  manufacturer            String?
  model                   String?
  serialNumber            String?        @map("serial_number")
  purchaseDate            DateTime?      @map("purchase_date")
  purchaseCost            Decimal?       @map("purchase_cost") @db.Decimal(12, 2)
  replacementCost         Decimal?       @map("replacement_cost") @db.Decimal(12, 2)
  usefulLifeYears         Int?           @map("useful_life_years")
  replacementYearOverride Int?           @map("replacement_year_override")
  warrantyEndDate         DateTime?      @map("warranty_end_date")
  supportEndDate          DateTime?      @map("support_end_date")
  lifecycleStatus         LifecycleStatus @default(active) @map("lifecycle_status")
  criticality             Criticality    @default(medium)
  fundingType             FundingType    @default(capex) @map("funding_type")
  locationId              String?        @map("location_id")
  location                Location?      @relation(fields: [locationId], references: [id])
  departmentId            String?        @map("department_id")
  department              Department?    @relation(fields: [departmentId], references: [id])
  vendorId                String?        @map("vendor_id")
  vendor                  Vendor?        @relation(fields: [vendorId], references: [id])
  assignedUserId          String?        @map("assigned_user_id")
  assignedUser            User?          @relation(fields: [assignedUserId], references: [id])
  businessOwner           String?        @map("business_owner")
  technicalOwner          String?        @map("technical_owner")
  notes                   String?
  createdAt               DateTime       @default(now()) @map("created_at")
  updatedAt               DateTime       @updatedAt @map("updated_at")
  contracts               Contract[]

  @@map("hardware_assets")
}
```

### 3.3 SoftwareProduct Model

```prisma
model SoftwareProduct {
  id                  String              @id @default(uuid())
  name                String
  vendorId            String?             @map("vendor_id")
  vendor              Vendor?             @relation(fields: [vendorId], references: [id])
  category            String?
  description         String?
  licenseModel        LicenseModel?       @map("license_model")
  qtyPurchased        Int?                @map("qty_purchased")
  qtyAssigned         Int?                @map("qty_assigned")
  qtyActivelyUsed     Int?                @map("qty_actively_used")
  unitCost            Decimal?            @map("unit_cost") @db.Decimal(12, 2)
  annualCost          Decimal?            @map("annual_cost") @db.Decimal(12, 2)
  billingFrequency    String?             @map("billing_frequency")
  contractStartDate   DateTime?           @map("contract_start_date")
  contractEndDate     DateTime?           @map("contract_end_date")
  renewalDate         DateTime?           @map("renewal_date")
  noticePeriodDays    Int?                @map("notice_period_days")
  autoRenewal         Boolean             @default(false) @map("auto_renewal")
  status              SoftwareStatus      @default(active)
  recommendedAction   RecommendedAction?  @map("recommended_action")
  fundingType         FundingType         @default(opex) @map("funding_type")
  departmentId        String?             @map("department_id")
  department          Department?         @relation(fields: [departmentId], references: [id])
  businessOwner       String?             @map("business_owner")
  technicalOwner      String?             @map("technical_owner")
  budgetOwner         String?             @map("budget_owner")
  strategicValue      String?             @map("strategic_value")
  riskIfNotRenewed    String?             @map("risk_if_not_renewed")
  notes               String?
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")
  contracts           Contract[]

  @@map("software_products")
}
```

### 3.4 Contract Model

```prisma
model Contract {
  id                          String          @id @default(uuid())
  name                        String
  vendorId                    String?         @map("vendor_id")
  vendor                      Vendor?         @relation(fields: [vendorId], references: [id])
  contractType                ContractType    @map("contract_type")
  hardwareAssetId             String?         @map("hardware_asset_id")
  hardwareAsset               HardwareAsset?  @relation(fields: [hardwareAssetId], references: [id])
  softwareProductId           String?         @map("software_product_id")
  softwareProduct             SoftwareProduct? @relation(fields: [softwareProductId], references: [id])
  startDate                   DateTime?       @map("start_date")
  endDate                     DateTime?       @map("end_date")
  renewalDate                 DateTime?       @map("renewal_date")
  noticePeriodDays            Int?            @map("notice_period_days")
  cancellationDeadlineOverride DateTime?      @map("cancellation_deadline_override")
  autoRenewal                 Boolean         @default(false) @map("auto_renewal")
  annualCost                  Decimal?        @map("annual_cost") @db.Decimal(12, 2)
  renewalCost                 Decimal?        @map("renewal_cost") @db.Decimal(12, 2)
  escalationPct               Decimal?        @map("escalation_pct") @db.Decimal(5, 2)
  approvalStatus              ApprovalStatus  @default(not_reviewed) @map("approval_status")
  documentLink                String?         @map("document_link")
  departmentId                String?         @map("department_id")
  department                  Department?     @relation(fields: [departmentId], references: [id])
  businessOwner               String?         @map("business_owner")
  technicalOwner              String?         @map("technical_owner")
  budgetOwner                 String?         @map("budget_owner")
  notes                       String?
  createdAt                   DateTime        @default(now()) @map("created_at")
  updatedAt                   DateTime        @updatedAt @map("updated_at")

  @@map("contracts")
}
```

### 3.5 Back-relations on existing models

Add to `Department`, `Location`, `Vendor`, `User`:
```prisma
// Department
hardwareAssets    HardwareAsset[]
softwareProducts  SoftwareProduct[]
contracts         Contract[]

// Location
hardwareAssets    HardwareAsset[]

// Vendor
hardwareAssets    HardwareAsset[]
softwareProducts  SoftwareProduct[]
contracts         Contract[]

// User
assignedAssets    HardwareAsset[]
```

---

## 4. API Design

### 4.1 Conventions (same as Phase 1)

- Base path: `/api/v1`
- All endpoints require JWT (`JwtAuthGuard` is global)
- RFC 7807 error responses via `HttpExceptionFilter`
- All writes emit an `AuditLog` entry via `AuditLogService`
- Soft deletes: set status to terminal value (`Retired` / `Terminated`) rather than deleting rows; hard delete only where noted

### 4.2 Hardware Assets — `/api/v1/hardware-assets`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/` | all | List with optional filters: `status`, `assetType`, `departmentId`, `locationId` |
| GET | `/:id` | all | Single asset + computed fields |
| POST | `/` | admin, editor | Create |
| PATCH | `/:id` | admin, editor | Update |
| DELETE | `/:id` | admin | Soft delete (sets `lifecycleStatus = retired`) |

**Computed fields returned on GET:**
```typescript
{
  replacementYear: number | null           // replacementYearOverride ?? (purchaseYear + usefulLifeYears)
  warrantyExpired: boolean                 // warrantyEndDate < today
  unsupported: boolean                     // supportEndDate < today
  highRisk: boolean                        // unsupported && criticality === 'mission_critical'
}
```

### 4.3 Software Products — `/api/v1/software-products`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/` | all | List with optional filters: `status`, `departmentId`, `vendorId` |
| GET | `/:id` | all | Single product + computed fields |
| POST | `/` | admin, editor | Create |
| PATCH | `/:id` | admin, editor | Update |
| DELETE | `/:id` | admin | Soft delete (sets `status = terminated`) |

**Computed fields returned on GET:**
```typescript
{
  utilizationRate: number | null           // qtyActivelyUsed / qtyPurchased; null if qtyPurchased is 0 or null
  unusedLicenses: number | null           // qtyPurchased - qtyActivelyUsed
  potentialSavings: number | null         // unusedLicenses * unitCost; only for per_user / per_device license models
  lowUtilization: boolean                 // utilizationRate !== null && utilizationRate < 0.70
}
```

### 4.4 Contracts — `/api/v1/contracts`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/` | all | List with computed deadline fields; optional filters: `contractType`, `approvalStatus`, `vendorId` |
| GET | `/:id` | all | Single contract + computed fields |
| POST | `/` | admin, editor | Create; validates at most one of `hardwareAssetId` / `softwareProductId` is set |
| PATCH | `/:id` | admin, editor | Update |
| DELETE | `/:id` | admin | Hard delete |

**Computed fields returned on GET:**
```typescript
{
  cancellationDeadline: Date | null       // cancellationDeadlineOverride ?? (renewalDate - noticePeriodDays days)
  daysUntilRenewal: number | null         // renewalDate - today (null if no renewalDate)
  urgency: 'red' | 'amber' | 'green' | null  // red < 30, amber < 90, green >= 90; null if no renewalDate
}
```

---

## 5. NestJS Module Structure

Each module follows the Phase 1 pattern exactly:

```
src/modules/hardware-assets/
  hardware-assets.module.ts
  hardware-assets.controller.ts
  hardware-assets.service.ts
  hardware-assets.service.spec.ts
  dto/
    create-hardware-asset.dto.ts
    update-hardware-asset.dto.ts

src/modules/software-products/
  (same pattern)

src/modules/contracts/
  (same pattern)
```

DTOs use `class-validator` decorators. Update DTOs extend create DTOs with `PartialType`. Service methods:
- `findAll(filters)` — returns list with computed fields
- `findOne(id)` — returns single record with computed fields; throws `NotFoundException` if not found
- `create(dto, actorId)` — creates record + audit log
- `update(id, dto, actorId)` — validates exists, updates record + audit log
- `remove(id, actorId)` — soft or hard delete + audit log

---

## 6. Computed Field Logic

All computed values are calculated in the service layer. Never stored in DB except explicit override fields.

### Hardware replacement year
```typescript
function computeReplacementYear(asset: HardwareAsset): number | null {
  if (asset.replacementYearOverride !== null) return asset.replacementYearOverride;
  if (!asset.purchaseDate || !asset.usefulLifeYears) return null;
  return asset.purchaseDate.getFullYear() + asset.usefulLifeYears;
}
```

### Software utilization
```typescript
function computeUtilization(product: SoftwareProduct) {
  const { qtyPurchased, qtyActivelyUsed, unitCost, licenseModel } = product;
  if (!qtyPurchased) return { utilizationRate: null, unusedLicenses: null, potentialSavings: null, lowUtilization: false };
  const utilizationRate = (qtyActivelyUsed ?? 0) / qtyPurchased;
  const unusedLicenses = qtyPurchased - (qtyActivelyUsed ?? 0);
  const perUnitModels = ['per_user', 'per_device'];
  const potentialSavings = perUnitModels.includes(licenseModel ?? '') && unitCost
    ? unusedLicenses * Number(unitCost)
    : null;
  return { utilizationRate, unusedLicenses, potentialSavings, lowUtilization: utilizationRate < 0.70 };
}
```

### Contract deadlines
```typescript
function computeContractDeadlines(contract: Contract) {
  const today = new Date();
  // cancellationDeadlineOverride only replaces the deadline date — renewal countdown still uses renewalDate
  const cancellationDeadline = contract.cancellationDeadlineOverride
    ?? (contract.renewalDate && contract.noticePeriodDays
      ? subDays(contract.renewalDate, contract.noticePeriodDays)
      : null);
  const daysUntilRenewal = contract.renewalDate
    ? differenceInDays(contract.renewalDate, today)
    : null;
  const urgency = daysUntilRenewal === null ? null
    : daysUntilRenewal < 30 ? 'red'
    : daysUntilRenewal < 90 ? 'amber'
    : 'green';
  return { cancellationDeadline, daysUntilRenewal, urgency };
}
```

Uses `date-fns` (`subDays`, `differenceInDays`). `date-fns` is not yet in the project — the implementation plan must include `pnpm add date-fns` in `apps/api`.

---

## 7. Frontend Pages

### 7.1 Sidebar update

`apps/web/components/layout/sidebar.tsx` — add Hardware, Software, Contracts links between Dashboard and Settings.

### 7.2 Hardware pages

| Route | File | Description |
|-------|------|-------------|
| `/hardware` | `app/(protected)/hardware/page.tsx` | Server component; fetches list; renders `HardwareTable` |
| `/hardware/new` | `app/(protected)/hardware/new/page.tsx` | Full-page create form |
| `/hardware/[id]` | `app/(protected)/hardware/[id]/page.tsx` | Detail view + inline edit form |

**List table columns:** Asset Tag, Type, Manufacturer / Model, Location, Department, Replacement Year, Status badge (color by lifecycle status), flags (Warranty Expired, Unsupported, High Risk badges).

**Create/edit form sections:**
1. Identity: Asset Tag, Asset Type, Manufacturer, Model, Serial Number
2. Lifecycle: Purchase Date, Useful Life (years), Replacement Year Override, Lifecycle Status, Criticality
3. Financials: Purchase Cost, Replacement Cost, Funding Type
4. Dates: Warranty End Date, Support End Date
5. Ownership: Location, Department, Vendor, Assigned User, Business Owner, Technical Owner
6. Notes

### 7.3 Software pages

| Route | File | Description |
|-------|------|-------------|
| `/software` | `app/(protected)/software/page.tsx` | Server component; fetches list |
| `/software/new` | `app/(protected)/software/new/page.tsx` | Full-page create form |
| `/software/[id]` | `app/(protected)/software/[id]/page.tsx` | Detail + edit |

**List table columns:** Name, Vendor, License Model, Qty Purchased, Utilization % (red < 70%, green ≥ 70%), Annual Cost, Renewal Date, Status badge.

**Create/edit form sections:**
1. Identity: Name, Vendor, Category, Description
2. Licensing: License Model, Qty Purchased, Qty Assigned, Qty Actively Used, Unit Cost, Annual Cost, Billing Frequency
3. Dates: Contract Start, Contract End, Renewal Date, Notice Period (days), Auto-Renewal
4. Classification: Status, Recommended Action, Funding Type, Strategic Value, Risk if Not Renewed
5. Ownership: Department, Business Owner, Technical Owner, Budget Owner
6. Notes

### 7.4 Contract pages

| Route | File | Description |
|-------|------|-------------|
| `/contracts` | `app/(protected)/contracts/page.tsx` | Server component; fetches list |
| `/contracts/new` | `app/(protected)/contracts/new/page.tsx` | Full-page create form |
| `/contracts/[id]` | `app/(protected)/contracts/[id]/page.tsx` | Detail + edit |

**List table columns:** Name, Vendor, Type, Annual Cost, Renewal Date, Cancellation Deadline, Days Until Renewal (urgency color), Approval Status badge.

**Create/edit form sections:**
1. Identity: Name, Vendor, Contract Type
2. Linked Asset: Hardware Asset (optional dropdown) OR Software Product (optional dropdown) — mutually exclusive
3. Dates: Start Date, End Date, Renewal Date, Notice Period (days), Cancellation Deadline Override, Auto-Renewal
4. Financials: Annual Cost, Renewal Cost, Escalation %
5. Ownership: Department, Business Owner, Technical Owner, Budget Owner, Approval Status, Document Link
6. Notes

### 7.5 Server actions

`apps/web/lib/actions/hardware-assets.ts` — `createHardwareAsset`, `updateHardwareAsset`, `deleteHardwareAsset`
`apps/web/lib/actions/software-products.ts` — same pattern
`apps/web/lib/actions/contracts.ts` — same pattern

All call `apiServer()`, use `revalidatePath()`, follow Phase 1 pattern.

---

## 8. Testing

### Unit tests (NestJS services — same TDD pattern as Phase 1)

For each service, test:
- `findAll` returns list (mock Prisma)
- `findOne` returns record with correct computed fields
- `findOne` throws `NotFoundException` for unknown id
- `create` calls `prisma.X.create` and `auditLog.log`
- `update` throws `NotFoundException` for unknown id
- `update` calls `prisma.X.update` and `auditLog.log`
- `remove` calls `prisma.X.update` (soft delete) or `prisma.X.delete` (hard delete) and `auditLog.log`
- Computed field logic (unit tests for pure functions: `computeReplacementYear`, `computeUtilization`, `computeContractDeadlines`)

### Manual verification

- API boots with no errors
- Login flow works
- Hardware list shows seed records; create/edit/delete work
- Software utilization colors render correctly
- Contracts urgency colors render correctly
- Audit log entries created for all writes

---

## 9. Seed Data

Add to `apps/api/prisma/seed.ts`:

- 3 hardware assets (1 active laptop, 1 server due for replacement, 1 retired device)
- 3 software products (1 Microsoft 365 with utilization, 1 low-utilization tool, 1 SaaS pending renewal)
- 2 contracts (1 linked to hardware, 1 linked to software, with upcoming renewal dates)

---

## 10. Migration

Apply via Supabase MCP `apply_migration` tool. The migration adds:
- 9 new enum types
- 3 new tables (`hardware_assets`, `software_products`, `contracts`)
- Back-relation columns on existing tables where needed (no breaking changes to existing tables)
