# LifecycleIQ Phase 2a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Hardware Assets, Software Products, and Contracts CRUD modules to LifecycleIQ — with computed lifecycle fields, urgency indicators, and dedicated top-level navigation.

**Architecture:** Three NestJS modules follow the Phase 1 pattern exactly (controller → service → Prisma → AuditLogService). Computed fields are calculated in the service layer using `date-fns` and returned in API responses — never stored in DB. Next.js App Router pages use server components that fetch data and pass it to `'use client'` components for interactivity. Server actions handle all mutations.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL (Supabase), date-fns, Next.js 14 App Router, NextAuth v5, TypeScript, Tailwind CSS, class-validator.

---

## File Map

**New — API:**
- `apps/api/src/modules/hardware-assets/dto/create-hardware-asset.dto.ts`
- `apps/api/src/modules/hardware-assets/dto/update-hardware-asset.dto.ts`
- `apps/api/src/modules/hardware-assets/hardware-assets.service.ts`
- `apps/api/src/modules/hardware-assets/hardware-assets.service.spec.ts`
- `apps/api/src/modules/hardware-assets/hardware-assets.controller.ts`
- `apps/api/src/modules/hardware-assets/hardware-assets.module.ts`
- `apps/api/src/modules/software-products/dto/create-software-product.dto.ts`
- `apps/api/src/modules/software-products/dto/update-software-product.dto.ts`
- `apps/api/src/modules/software-products/software-products.service.ts`
- `apps/api/src/modules/software-products/software-products.service.spec.ts`
- `apps/api/src/modules/software-products/software-products.controller.ts`
- `apps/api/src/modules/software-products/software-products.module.ts`
- `apps/api/src/modules/contracts/dto/create-contract.dto.ts`
- `apps/api/src/modules/contracts/dto/update-contract.dto.ts`
- `apps/api/src/modules/contracts/contracts.service.ts`
- `apps/api/src/modules/contracts/contracts.service.spec.ts`
- `apps/api/src/modules/contracts/contracts.controller.ts`
- `apps/api/src/modules/contracts/contracts.module.ts`

**New — Shared:**
- `packages/shared/src/types/hardware-asset.ts`
- `packages/shared/src/types/software-product.ts`
- `packages/shared/src/types/contract.ts`

**New — Web:**
- `apps/web/lib/actions/hardware-assets.ts`
- `apps/web/lib/actions/software-products.ts`
- `apps/web/lib/actions/contracts.ts`
- `apps/web/app/(protected)/hardware/page.tsx`
- `apps/web/app/(protected)/hardware/client.tsx`
- `apps/web/app/(protected)/hardware/form.tsx`
- `apps/web/app/(protected)/hardware/new/page.tsx`
- `apps/web/app/(protected)/hardware/[id]/page.tsx`
- `apps/web/app/(protected)/software/client.tsx`
- `apps/web/app/(protected)/software/form.tsx`
- `apps/web/app/(protected)/software/new/page.tsx`
- `apps/web/app/(protected)/software/[id]/page.tsx`
- `apps/web/app/(protected)/contracts/client.tsx`
- `apps/web/app/(protected)/contracts/form.tsx`
- `apps/web/app/(protected)/contracts/new/page.tsx`
- `apps/web/app/(protected)/contracts/[id]/page.tsx`

**Modified:**
- `apps/api/prisma/schema.prisma` — add 9 enums, 3 models, back-relations
- `apps/api/src/app.module.ts` — register 3 new modules
- `apps/api/prisma/seed.ts` — add Phase 2 seed records
- `packages/shared/src/index.ts` — export new types
- `apps/web/components/layout/sidebar.tsx` — rename Assets→Hardware, update href
- `apps/web/app/(protected)/software/page.tsx` — replace placeholder
- `apps/web/app/(protected)/contracts/page.tsx` — replace placeholder

**Deleted:**
- `apps/web/app/(protected)/assets/page.tsx` — replaced by `hardware/` directory

---

### Task 1: Prisma Schema Additions + Install date-fns

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Install date-fns in the API package**

```bash
cd apps/api && pnpm add date-fns
```

Expected: `date-fns` added to `apps/api/package.json` dependencies.

- [ ] **Step 2: Add enums and models to the Prisma schema**

Open `apps/api/prisma/schema.prisma`. After the existing `Role` enum and before the `User` model, add the 9 new enums. Then add the 3 new models at the end of the file. Also add back-relations to existing models as shown below.

Replace the full contents of `apps/api/prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  admin
  editor
  finance_viewer
  department_viewer
  viewer
}

enum AssetType {
  laptop
  desktop
  tablet
  server
  storage
  network_switch
  wireless_access_point
  firewall
  ups
  printer
  mfp_copier
  classroom_display
  projector
  av_equipment
  phone
  camera
  iot_device
  other
}

enum LifecycleStatus {
  planned
  ordered
  active
  spare
  in_repair
  due_for_replacement
  deferred
  retired
  disposed
}

enum Criticality {
  low
  medium
  high
  mission_critical
}

enum FundingType {
  opex
  capex
}

enum LicenseModel {
  per_user
  per_device
  site_license
  fte_based
  concurrent_user
  consumption_based
  flat_annual
  multi_year_agreement
  other
}

enum SoftwareStatus {
  active
  trial
  under_review
  renewal_pending
  sunset_planned
  replaced
  terminated
}

enum RecommendedAction {
  renew_as_is
  renew_with_reduction
  expand
  renegotiate
  replace
  consolidate
  terminate
  monitor
  escalate
}

enum ContractType {
  software_subscription
  saas_agreement
  hardware_support
  maintenance_agreement
  managed_service
  telecom
  internet_circuit
  cloud_service
  professional_service
  warranty
  other
}

enum ApprovalStatus {
  not_reviewed
  review_required
  pending_quote
  pending_approval
  approved
  rejected
  deferred
  cancelled
}

model User {
  id             String          @id @default(uuid())
  email          String          @unique
  displayName    String          @map("display_name")
  passwordHash   String          @map("password_hash")
  role           Role            @default(viewer)
  departmentId   String?         @map("department_id")
  department     Department?     @relation(fields: [departmentId], references: [id])
  isActive       Boolean         @default(true) @map("is_active")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")
  assignedAssets HardwareAsset[]

  @@map("users")
}

model Department {
  id               String            @id @default(uuid())
  name             String
  budgetCode       String?           @map("budget_code")
  ownerId          String?           @map("owner_id")
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")
  users            User[]
  hardwareAssets   HardwareAsset[]
  softwareProducts SoftwareProduct[]
  contracts        Contract[]

  @@map("departments")
}

model Location {
  id             String          @id @default(uuid())
  name           String
  building       String?
  room           String?
  locationType   String?         @map("location_type")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")
  hardwareAssets HardwareAsset[]

  @@map("locations")
}

model Vendor {
  id               String            @id @default(uuid())
  name             String
  website          String?
  accountRepName   String?           @map("account_rep_name")
  accountRepEmail  String?           @map("account_rep_email")
  supportEmail     String?           @map("support_email")
  notes            String?
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")
  hardwareAssets   HardwareAsset[]
  softwareProducts SoftwareProduct[]
  contracts        Contract[]

  @@map("vendors")
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?  @map("user_id")
  action     String
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  oldValue   Json?    @map("old_value")
  newValue   Json?    @map("new_value")
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("audit_log")
}

model HardwareAsset {
  id                      String          @id @default(uuid())
  assetTag                String?         @unique @map("asset_tag")
  assetType               AssetType       @map("asset_type")
  manufacturer            String?
  model                   String?
  serialNumber            String?         @map("serial_number")
  purchaseDate            DateTime?       @map("purchase_date")
  purchaseCost            Decimal?        @map("purchase_cost") @db.Decimal(12, 2)
  replacementCost         Decimal?        @map("replacement_cost") @db.Decimal(12, 2)
  usefulLifeYears         Int?            @map("useful_life_years")
  replacementYearOverride Int?            @map("replacement_year_override")
  warrantyEndDate         DateTime?       @map("warranty_end_date")
  supportEndDate          DateTime?       @map("support_end_date")
  lifecycleStatus         LifecycleStatus @default(active) @map("lifecycle_status")
  criticality             Criticality     @default(medium)
  fundingType             FundingType     @default(capex) @map("funding_type")
  locationId              String?         @map("location_id")
  location                Location?       @relation(fields: [locationId], references: [id])
  departmentId            String?         @map("department_id")
  department              Department?     @relation(fields: [departmentId], references: [id])
  vendorId                String?         @map("vendor_id")
  vendor                  Vendor?         @relation(fields: [vendorId], references: [id])
  assignedUserId          String?         @map("assigned_user_id")
  assignedUser            User?           @relation(fields: [assignedUserId], references: [id])
  businessOwner           String?         @map("business_owner")
  technicalOwner          String?         @map("technical_owner")
  notes                   String?
  createdAt               DateTime        @default(now()) @map("created_at")
  updatedAt               DateTime        @updatedAt @map("updated_at")
  contracts               Contract[]

  @@map("hardware_assets")
}

model SoftwareProduct {
  id                String             @id @default(uuid())
  name              String
  vendorId          String?            @map("vendor_id")
  vendor            Vendor?            @relation(fields: [vendorId], references: [id])
  category          String?
  description       String?
  licenseModel      LicenseModel?      @map("license_model")
  qtyPurchased      Int?               @map("qty_purchased")
  qtyAssigned       Int?               @map("qty_assigned")
  qtyActivelyUsed   Int?               @map("qty_actively_used")
  unitCost          Decimal?           @map("unit_cost") @db.Decimal(12, 2)
  annualCost        Decimal?           @map("annual_cost") @db.Decimal(12, 2)
  billingFrequency  String?            @map("billing_frequency")
  contractStartDate DateTime?          @map("contract_start_date")
  contractEndDate   DateTime?          @map("contract_end_date")
  renewalDate       DateTime?          @map("renewal_date")
  noticePeriodDays  Int?               @map("notice_period_days")
  autoRenewal       Boolean            @default(false) @map("auto_renewal")
  status            SoftwareStatus     @default(active)
  recommendedAction RecommendedAction? @map("recommended_action")
  fundingType       FundingType        @default(opex) @map("funding_type")
  departmentId      String?            @map("department_id")
  department        Department?        @relation(fields: [departmentId], references: [id])
  businessOwner     String?            @map("business_owner")
  technicalOwner    String?            @map("technical_owner")
  budgetOwner       String?            @map("budget_owner")
  strategicValue    String?            @map("strategic_value")
  riskIfNotRenewed  String?            @map("risk_if_not_renewed")
  notes             String?
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  contracts         Contract[]

  @@map("software_products")
}

model Contract {
  id                          String           @id @default(uuid())
  name                        String
  vendorId                    String?          @map("vendor_id")
  vendor                      Vendor?          @relation(fields: [vendorId], references: [id])
  contractType                ContractType     @map("contract_type")
  hardwareAssetId             String?          @map("hardware_asset_id")
  hardwareAsset               HardwareAsset?   @relation(fields: [hardwareAssetId], references: [id])
  softwareProductId           String?          @map("software_product_id")
  softwareProduct             SoftwareProduct? @relation(fields: [softwareProductId], references: [id])
  startDate                   DateTime?        @map("start_date")
  endDate                     DateTime?        @map("end_date")
  renewalDate                 DateTime?        @map("renewal_date")
  noticePeriodDays            Int?             @map("notice_period_days")
  cancellationDeadlineOverride DateTime?       @map("cancellation_deadline_override")
  autoRenewal                 Boolean          @default(false) @map("auto_renewal")
  annualCost                  Decimal?         @map("annual_cost") @db.Decimal(12, 2)
  renewalCost                 Decimal?         @map("renewal_cost") @db.Decimal(12, 2)
  escalationPct               Decimal?         @map("escalation_pct") @db.Decimal(5, 2)
  approvalStatus              ApprovalStatus   @default(not_reviewed) @map("approval_status")
  documentLink                String?          @map("document_link")
  departmentId                String?          @map("department_id")
  department                  Department?      @relation(fields: [departmentId], references: [id])
  businessOwner               String?          @map("business_owner")
  technicalOwner              String?          @map("technical_owner")
  budgetOwner                 String?          @map("budget_owner")
  notes                       String?
  createdAt                   DateTime         @default(now()) @map("created_at")
  updatedAt                   DateTime         @updatedAt @map("updated_at")

  @@map("contracts")
}
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd apps/api && pnpm db:generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add Phase 2a Prisma schema — 9 enums, 3 models, back-relations"
```

---

### Task 2: Supabase Migration

**Files:**
- No file changes — apply DDL via Supabase MCP tool

- [ ] **Step 1: Apply the migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with `name: "phase2a_hardware_software_contracts"` and the following SQL:

```sql
-- Enums
CREATE TYPE "AssetType" AS ENUM (
  'laptop','desktop','tablet','server','storage',
  'network_switch','wireless_access_point','firewall','ups',
  'printer','mfp_copier','classroom_display','projector',
  'av_equipment','phone','camera','iot_device','other'
);

CREATE TYPE "LifecycleStatus" AS ENUM (
  'planned','ordered','active','spare','in_repair',
  'due_for_replacement','deferred','retired','disposed'
);

CREATE TYPE "Criticality" AS ENUM ('low','medium','high','mission_critical');

CREATE TYPE "FundingType" AS ENUM ('opex','capex');

CREATE TYPE "LicenseModel" AS ENUM (
  'per_user','per_device','site_license','fte_based',
  'concurrent_user','consumption_based','flat_annual',
  'multi_year_agreement','other'
);

CREATE TYPE "SoftwareStatus" AS ENUM (
  'active','trial','under_review','renewal_pending',
  'sunset_planned','replaced','terminated'
);

CREATE TYPE "RecommendedAction" AS ENUM (
  'renew_as_is','renew_with_reduction','expand','renegotiate',
  'replace','consolidate','terminate','monitor','escalate'
);

CREATE TYPE "ContractType" AS ENUM (
  'software_subscription','saas_agreement','hardware_support',
  'maintenance_agreement','managed_service','telecom',
  'internet_circuit','cloud_service','professional_service',
  'warranty','other'
);

CREATE TYPE "ApprovalStatus" AS ENUM (
  'not_reviewed','review_required','pending_quote',
  'pending_approval','approved','rejected','deferred','cancelled'
);

-- hardware_assets
CREATE TABLE hardware_assets (
  id TEXT NOT NULL PRIMARY KEY,
  asset_tag TEXT UNIQUE,
  asset_type "AssetType" NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date TIMESTAMPTZ,
  purchase_cost DECIMAL(12,2),
  replacement_cost DECIMAL(12,2),
  useful_life_years INTEGER,
  replacement_year_override INTEGER,
  warranty_end_date TIMESTAMPTZ,
  support_end_date TIMESTAMPTZ,
  lifecycle_status "LifecycleStatus" NOT NULL DEFAULT 'active',
  criticality "Criticality" NOT NULL DEFAULT 'medium',
  funding_type "FundingType" NOT NULL DEFAULT 'capex',
  location_id TEXT REFERENCES locations(id),
  department_id TEXT REFERENCES departments(id),
  vendor_id TEXT REFERENCES vendors(id),
  assigned_user_id TEXT REFERENCES users(id),
  business_owner TEXT,
  technical_owner TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- software_products
CREATE TABLE software_products (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  vendor_id TEXT REFERENCES vendors(id),
  category TEXT,
  description TEXT,
  license_model "LicenseModel",
  qty_purchased INTEGER,
  qty_assigned INTEGER,
  qty_actively_used INTEGER,
  unit_cost DECIMAL(12,2),
  annual_cost DECIMAL(12,2),
  billing_frequency TEXT,
  contract_start_date TIMESTAMPTZ,
  contract_end_date TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  notice_period_days INTEGER,
  auto_renewal BOOLEAN NOT NULL DEFAULT FALSE,
  status "SoftwareStatus" NOT NULL DEFAULT 'active',
  recommended_action "RecommendedAction",
  funding_type "FundingType" NOT NULL DEFAULT 'opex',
  department_id TEXT REFERENCES departments(id),
  business_owner TEXT,
  technical_owner TEXT,
  budget_owner TEXT,
  strategic_value TEXT,
  risk_if_not_renewed TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- contracts
CREATE TABLE contracts (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  vendor_id TEXT REFERENCES vendors(id),
  contract_type "ContractType" NOT NULL,
  hardware_asset_id TEXT REFERENCES hardware_assets(id),
  software_product_id TEXT REFERENCES software_products(id),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  notice_period_days INTEGER,
  cancellation_deadline_override TIMESTAMPTZ,
  auto_renewal BOOLEAN NOT NULL DEFAULT FALSE,
  annual_cost DECIMAL(12,2),
  renewal_cost DECIMAL(12,2),
  escalation_pct DECIMAL(5,2),
  approval_status "ApprovalStatus" NOT NULL DEFAULT 'not_reviewed',
  document_link TEXT,
  department_id TEXT REFERENCES departments(id),
  business_owner TEXT,
  technical_owner TEXT,
  budget_owner TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Verify tables exist**

Use `mcp__claude_ai_Supabase__list_tables` to confirm `hardware_assets`, `software_products`, and `contracts` appear.

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "feat: apply Phase 2a Supabase migration via MCP"
```

---

### Task 3: Shared Package Types

**Files:**
- Create: `packages/shared/src/types/hardware-asset.ts`
- Create: `packages/shared/src/types/software-product.ts`
- Create: `packages/shared/src/types/contract.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create hardware-asset.ts**

```typescript
// packages/shared/src/types/hardware-asset.ts
export interface HardwareAsset {
  id: string;
  assetTag: string | null;
  assetType: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: Date | null;
  purchaseCost: string | null;
  replacementCost: string | null;
  usefulLifeYears: number | null;
  replacementYearOverride: number | null;
  warrantyEndDate: Date | null;
  supportEndDate: Date | null;
  lifecycleStatus: string;
  criticality: string;
  fundingType: string;
  locationId: string | null;
  departmentId: string | null;
  vendorId: string | null;
  assignedUserId: string | null;
  businessOwner: string | null;
  technicalOwner: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // computed fields
  replacementYear: number | null;
  warrantyExpired: boolean;
  unsupported: boolean;
  highRisk: boolean;
}

export interface CreateHardwareAssetInput {
  assetType: string;
  assetTag?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseCost?: string;
  replacementCost?: string;
  usefulLifeYears?: number;
  replacementYearOverride?: number;
  warrantyEndDate?: string;
  supportEndDate?: string;
  lifecycleStatus?: string;
  criticality?: string;
  fundingType?: string;
  locationId?: string;
  departmentId?: string;
  vendorId?: string;
  assignedUserId?: string;
  businessOwner?: string;
  technicalOwner?: string;
  notes?: string;
}

export interface UpdateHardwareAssetInput extends Partial<CreateHardwareAssetInput> {}
```

- [ ] **Step 2: Create software-product.ts**

```typescript
// packages/shared/src/types/software-product.ts
export interface SoftwareProduct {
  id: string;
  name: string;
  vendorId: string | null;
  category: string | null;
  description: string | null;
  licenseModel: string | null;
  qtyPurchased: number | null;
  qtyAssigned: number | null;
  qtyActivelyUsed: number | null;
  unitCost: string | null;
  annualCost: string | null;
  billingFrequency: string | null;
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  renewalDate: Date | null;
  noticePeriodDays: number | null;
  autoRenewal: boolean;
  status: string;
  recommendedAction: string | null;
  fundingType: string;
  departmentId: string | null;
  businessOwner: string | null;
  technicalOwner: string | null;
  budgetOwner: string | null;
  strategicValue: string | null;
  riskIfNotRenewed: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // computed fields
  utilizationRate: number | null;
  unusedLicenses: number | null;
  potentialSavings: number | null;
  lowUtilization: boolean;
}

export interface CreateSoftwareProductInput {
  name: string;
  vendorId?: string;
  category?: string;
  description?: string;
  licenseModel?: string;
  qtyPurchased?: number;
  qtyAssigned?: number;
  qtyActivelyUsed?: number;
  unitCost?: string;
  annualCost?: string;
  billingFrequency?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  renewalDate?: string;
  noticePeriodDays?: number;
  autoRenewal?: boolean;
  status?: string;
  recommendedAction?: string;
  fundingType?: string;
  departmentId?: string;
  businessOwner?: string;
  technicalOwner?: string;
  budgetOwner?: string;
  strategicValue?: string;
  riskIfNotRenewed?: string;
  notes?: string;
}

export interface UpdateSoftwareProductInput extends Partial<CreateSoftwareProductInput> {}
```

- [ ] **Step 3: Create contract.ts**

```typescript
// packages/shared/src/types/contract.ts
export interface Contract {
  id: string;
  name: string;
  vendorId: string | null;
  contractType: string;
  hardwareAssetId: string | null;
  softwareProductId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  renewalDate: Date | null;
  noticePeriodDays: number | null;
  cancellationDeadlineOverride: Date | null;
  autoRenewal: boolean;
  annualCost: string | null;
  renewalCost: string | null;
  escalationPct: string | null;
  approvalStatus: string;
  documentLink: string | null;
  departmentId: string | null;
  businessOwner: string | null;
  technicalOwner: string | null;
  budgetOwner: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  // computed fields
  cancellationDeadline: Date | null;
  daysUntilRenewal: number | null;
  urgency: 'red' | 'amber' | 'green' | null;
}

export interface CreateContractInput {
  name: string;
  contractType: string;
  vendorId?: string;
  hardwareAssetId?: string;
  softwareProductId?: string;
  startDate?: string;
  endDate?: string;
  renewalDate?: string;
  noticePeriodDays?: number;
  cancellationDeadlineOverride?: string;
  autoRenewal?: boolean;
  annualCost?: string;
  renewalCost?: string;
  escalationPct?: string;
  approvalStatus?: string;
  documentLink?: string;
  departmentId?: string;
  businessOwner?: string;
  technicalOwner?: string;
  budgetOwner?: string;
  notes?: string;
}

export interface UpdateContractInput extends Partial<CreateContractInput> {}
```

- [ ] **Step 4: Update shared index.ts**

```typescript
// packages/shared/src/index.ts
export * from './enums/role.enum';
export * from './types/user';
export * from './types/department';
export * from './types/location';
export * from './types/vendor';
export * from './types/audit-log';
export * from './types/hardware-asset';
export * from './types/software-product';
export * from './types/contract';
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/hardware-asset.ts packages/shared/src/types/software-product.ts packages/shared/src/types/contract.ts packages/shared/src/index.ts
git commit -m "feat: add shared types for hardware assets, software products, contracts"
```

---

### Task 4: Hardware Assets NestJS Module (TDD)

**Files:**
- Create: `apps/api/src/modules/hardware-assets/dto/create-hardware-asset.dto.ts`
- Create: `apps/api/src/modules/hardware-assets/dto/update-hardware-asset.dto.ts`
- Create: `apps/api/src/modules/hardware-assets/hardware-assets.service.spec.ts`
- Create: `apps/api/src/modules/hardware-assets/hardware-assets.service.ts`
- Create: `apps/api/src/modules/hardware-assets/hardware-assets.controller.ts`
- Create: `apps/api/src/modules/hardware-assets/hardware-assets.module.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/src/modules/hardware-assets/hardware-assets.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HardwareAssetsService, computeHardwareFields } from './hardware-assets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  hardwareAsset: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};
const mockAuditLog = { log: jest.fn() };

const baseAsset = {
  id: 'hw-1',
  assetTag: 'TAG-001',
  assetType: 'laptop',
  manufacturer: 'Dell',
  model: 'Latitude',
  serialNumber: null,
  purchaseDate: new Date('2020-01-01'),
  purchaseCost: null,
  replacementCost: null,
  usefulLifeYears: 4,
  replacementYearOverride: null,
  warrantyEndDate: new Date('2023-01-01'),
  supportEndDate: null,
  lifecycleStatus: 'active',
  criticality: 'medium',
  fundingType: 'capex',
  locationId: null,
  departmentId: null,
  vendorId: null,
  assignedUserId: null,
  businessOwner: null,
  technicalOwner: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('computeHardwareFields', () => {
  it('computes replacementYear from purchaseDate + usefulLifeYears', () => {
    const result = computeHardwareFields({ ...baseAsset, purchaseDate: new Date('2020-01-01'), usefulLifeYears: 4, replacementYearOverride: null } as any);
    expect(result.replacementYear).toBe(2024);
  });

  it('uses replacementYearOverride when set', () => {
    const result = computeHardwareFields({ ...baseAsset, replacementYearOverride: 2026 } as any);
    expect(result.replacementYear).toBe(2026);
  });

  it('returns null replacementYear when purchaseDate and usefulLifeYears are missing', () => {
    const result = computeHardwareFields({ ...baseAsset, purchaseDate: null, usefulLifeYears: null, replacementYearOverride: null } as any);
    expect(result.replacementYear).toBeNull();
  });

  it('sets warrantyExpired true for a past date', () => {
    const result = computeHardwareFields({ ...baseAsset, warrantyEndDate: new Date('2020-01-01') } as any);
    expect(result.warrantyExpired).toBe(true);
  });

  it('sets warrantyExpired false for a future date', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 2);
    const result = computeHardwareFields({ ...baseAsset, warrantyEndDate: future } as any);
    expect(result.warrantyExpired).toBe(false);
  });

  it('sets highRisk true when unsupported and mission_critical', () => {
    const result = computeHardwareFields({ ...baseAsset, supportEndDate: new Date('2020-01-01'), criticality: 'mission_critical' } as any);
    expect(result.highRisk).toBe(true);
  });

  it('sets highRisk false when unsupported but not mission_critical', () => {
    const result = computeHardwareFields({ ...baseAsset, supportEndDate: new Date('2020-01-01'), criticality: 'medium' } as any);
    expect(result.highRisk).toBe(false);
  });
});

describe('HardwareAssetsService', () => {
  let service: HardwareAssetsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HardwareAssetsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<HardwareAssetsService>(HardwareAssetsService);
  });

  describe('findAll', () => {
    it('returns assets with computed fields', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([baseAsset]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('replacementYear');
      expect(result[0]).toHaveProperty('warrantyExpired');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.hardwareAsset.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns asset with computed fields', async () => {
      mockPrisma.hardwareAsset.findUnique.mockResolvedValue(baseAsset);
      const result = await service.findOne('hw-1');
      expect(result.id).toBe('hw-1');
      expect(result.replacementYear).toBe(2024);
    });
  });

  describe('create', () => {
    it('creates asset and writes audit log', async () => {
      mockPrisma.hardwareAsset.create.mockResolvedValue(baseAsset);
      await service.create({ assetType: 'laptop' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'HardwareAsset' }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.hardwareAsset.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {}, 'actor')).rejects.toThrow(NotFoundException);
    });

    it('updates asset and writes audit log', async () => {
      mockPrisma.hardwareAsset.findUnique.mockResolvedValue(baseAsset);
      mockPrisma.hardwareAsset.update.mockResolvedValue({ ...baseAsset, lifecycleStatus: 'due_for_replacement' });
      await service.update('hw-1', { lifecycleStatus: 'due_for_replacement' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'HardwareAsset' }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.hardwareAsset.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes by setting lifecycleStatus to retired and writes audit log', async () => {
      mockPrisma.hardwareAsset.findUnique.mockResolvedValue(baseAsset);
      mockPrisma.hardwareAsset.update.mockResolvedValue({ ...baseAsset, lifecycleStatus: 'retired' });
      await service.remove('hw-1', 'actor-id');
      expect(mockPrisma.hardwareAsset.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lifecycleStatus: 'retired' }) }),
      );
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'HardwareAsset', entityId: 'hw-1' }),
      );
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd apps/api && pnpm test -- --testPathPattern="hardware-assets.service" --verbose
```

Expected: FAIL — `Cannot find module './hardware-assets.service'`

- [ ] **Step 3: Create DTOs**

```typescript
// apps/api/src/modules/hardware-assets/dto/create-hardware-asset.dto.ts
import { IsString, IsOptional, IsEnum, IsInt, IsNumberString, IsDateString, IsUUID, IsBoolean } from 'class-validator';
import { AssetType, LifecycleStatus, Criticality, FundingType } from '@prisma/client';

export class CreateHardwareAssetDto {
  @IsEnum(AssetType)
  assetType: string;

  @IsOptional() @IsString()
  assetTag?: string;

  @IsOptional() @IsString()
  manufacturer?: string;

  @IsOptional() @IsString()
  model?: string;

  @IsOptional() @IsString()
  serialNumber?: string;

  @IsOptional() @IsDateString()
  purchaseDate?: string;

  @IsOptional() @IsNumberString()
  purchaseCost?: string;

  @IsOptional() @IsNumberString()
  replacementCost?: string;

  @IsOptional() @IsInt()
  usefulLifeYears?: number;

  @IsOptional() @IsInt()
  replacementYearOverride?: number;

  @IsOptional() @IsDateString()
  warrantyEndDate?: string;

  @IsOptional() @IsDateString()
  supportEndDate?: string;

  @IsOptional() @IsEnum(LifecycleStatus)
  lifecycleStatus?: string;

  @IsOptional() @IsEnum(Criticality)
  criticality?: string;

  @IsOptional() @IsEnum(FundingType)
  fundingType?: string;

  @IsOptional() @IsUUID()
  locationId?: string;

  @IsOptional() @IsUUID()
  departmentId?: string;

  @IsOptional() @IsUUID()
  vendorId?: string;

  @IsOptional() @IsUUID()
  assignedUserId?: string;

  @IsOptional() @IsString()
  businessOwner?: string;

  @IsOptional() @IsString()
  technicalOwner?: string;

  @IsOptional() @IsString()
  notes?: string;
}
```

```typescript
// apps/api/src/modules/hardware-assets/dto/update-hardware-asset.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateHardwareAssetDto } from './create-hardware-asset.dto';

export class UpdateHardwareAssetDto extends PartialType(CreateHardwareAssetDto) {}
```

- [ ] **Step 4: Create the service**

```typescript
// apps/api/src/modules/hardware-assets/hardware-assets.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { HardwareAsset } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateHardwareAssetDto } from './dto/create-hardware-asset.dto';
import { UpdateHardwareAssetDto } from './dto/update-hardware-asset.dto';

export type HardwareAssetWithComputed = HardwareAsset & {
  replacementYear: number | null;
  warrantyExpired: boolean;
  unsupported: boolean;
  highRisk: boolean;
};

export function computeHardwareFields(asset: HardwareAsset): HardwareAssetWithComputed {
  const today = new Date();
  const replacementYear =
    asset.replacementYearOverride !== null && asset.replacementYearOverride !== undefined
      ? asset.replacementYearOverride
      : asset.purchaseDate && asset.usefulLifeYears
        ? asset.purchaseDate.getFullYear() + asset.usefulLifeYears
        : null;
  const warrantyExpired = asset.warrantyEndDate ? asset.warrantyEndDate < today : false;
  const unsupported = asset.supportEndDate ? asset.supportEndDate < today : false;
  const highRisk = unsupported && asset.criticality === 'mission_critical';
  return { ...asset, replacementYear, warrantyExpired, unsupported, highRisk };
}

@Injectable()
export class HardwareAssetsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(filters?: {
    lifecycleStatus?: string;
    assetType?: string;
    departmentId?: string;
    locationId?: string;
  }): Promise<HardwareAssetWithComputed[]> {
    const where: Record<string, unknown> = {};
    if (filters?.lifecycleStatus) where.lifecycleStatus = filters.lifecycleStatus;
    if (filters?.assetType) where.assetType = filters.assetType;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.locationId) where.locationId = filters.locationId;
    const assets = await this.prisma.hardwareAsset.findMany({ where, orderBy: { createdAt: 'desc' } });
    return assets.map(computeHardwareFields);
  }

  async findOne(id: string): Promise<HardwareAssetWithComputed> {
    const asset = await this.prisma.hardwareAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`HardwareAsset ${id} not found`);
    return computeHardwareFields(asset);
  }

  async create(dto: CreateHardwareAssetDto, actorId: string): Promise<HardwareAssetWithComputed> {
    const asset = await this.prisma.hardwareAsset.create({
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        supportEndDate: dto.supportEndDate ? new Date(dto.supportEndDate) : undefined,
      } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'HardwareAsset',
      entityId: asset.id,
      newValue: { assetType: asset.assetType, manufacturer: asset.manufacturer },
    });
    return computeHardwareFields(asset);
  }

  async update(id: string, dto: UpdateHardwareAssetDto, actorId: string): Promise<HardwareAssetWithComputed> {
    const existing = await this.findOne(id);
    const asset = await this.prisma.hardwareAsset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        supportEndDate: dto.supportEndDate ? new Date(dto.supportEndDate) : undefined,
      } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'HardwareAsset',
      entityId: id,
      oldValue: { lifecycleStatus: existing.lifecycleStatus },
      newValue: { lifecycleStatus: asset.lifecycleStatus },
    });
    return computeHardwareFields(asset);
  }

  async remove(id: string, actorId: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.prisma.hardwareAsset.update({
      where: { id },
      data: { lifecycleStatus: 'retired' } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'HardwareAsset',
      entityId: id,
    });
    return { deleted: true };
  }
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd apps/api && pnpm test -- --testPathPattern="hardware-assets.service" --verbose
```

Expected: PASS — 14 tests passing.

- [ ] **Step 6: Create the controller**

```typescript
// apps/api/src/modules/hardware-assets/hardware-assets.controller.ts
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateHardwareAssetDto } from './dto/create-hardware-asset.dto';
import { UpdateHardwareAssetDto } from './dto/update-hardware-asset.dto';
import { HardwareAssetsService } from './hardware-assets.service';

@Controller('hardware-assets')
export class HardwareAssetsController {
  constructor(private service: HardwareAssetsService) {}

  @Get()
  findAll(
    @Query('lifecycleStatus') lifecycleStatus?: string,
    @Query('assetType') assetType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.service.findAll({ lifecycleStatus, assetType, departmentId, locationId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateHardwareAssetDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.create(dto, user!.id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHardwareAssetDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.service.update(id, dto, user!.id);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | undefined) {
    return this.service.remove(id, user!.id);
  }
}
```

- [ ] **Step 7: Create the module**

```typescript
// apps/api/src/modules/hardware-assets/hardware-assets.module.ts
import { Module } from '@nestjs/common';
import { HardwareAssetsController } from './hardware-assets.controller';
import { HardwareAssetsService } from './hardware-assets.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [HardwareAssetsController],
  providers: [HardwareAssetsService],
})
export class HardwareAssetsModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/hardware-assets/
git commit -m "feat: add HardwareAssets NestJS module with TDD"
```

---

### Task 5: Software Products NestJS Module (TDD)

**Files:**
- Create: `apps/api/src/modules/software-products/dto/create-software-product.dto.ts`
- Create: `apps/api/src/modules/software-products/dto/update-software-product.dto.ts`
- Create: `apps/api/src/modules/software-products/software-products.service.spec.ts`
- Create: `apps/api/src/modules/software-products/software-products.service.ts`
- Create: `apps/api/src/modules/software-products/software-products.controller.ts`
- Create: `apps/api/src/modules/software-products/software-products.module.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/src/modules/software-products/software-products.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SoftwareProductsService, computeUtilization } from './software-products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  softwareProduct: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};
const mockAuditLog = { log: jest.fn() };

const baseProduct = {
  id: 'sw-1',
  name: 'Microsoft 365',
  vendorId: null,
  category: 'Productivity',
  description: null,
  licenseModel: 'per_user',
  qtyPurchased: 100,
  qtyAssigned: 90,
  qtyActivelyUsed: 80,
  unitCost: '15.00',
  annualCost: '18000.00',
  billingFrequency: 'monthly',
  contractStartDate: null,
  contractEndDate: null,
  renewalDate: null,
  noticePeriodDays: null,
  autoRenewal: false,
  status: 'active',
  recommendedAction: null,
  fundingType: 'opex',
  departmentId: null,
  businessOwner: null,
  technicalOwner: null,
  budgetOwner: null,
  strategicValue: null,
  riskIfNotRenewed: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('computeUtilization', () => {
  it('returns null fields when qtyPurchased is null', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: null } as any);
    expect(result.utilizationRate).toBeNull();
    expect(result.unusedLicenses).toBeNull();
    expect(result.potentialSavings).toBeNull();
    expect(result.lowUtilization).toBe(false);
  });

  it('computes utilizationRate correctly', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 80 } as any);
    expect(result.utilizationRate).toBe(0.8);
  });

  it('computes unusedLicenses correctly', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 80 } as any);
    expect(result.unusedLicenses).toBe(20);
  });

  it('computes potentialSavings for per_user model', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 80, unitCost: '15.00', licenseModel: 'per_user' } as any);
    expect(result.potentialSavings).toBe(300);
  });

  it('returns null potentialSavings for site_license model', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 80, unitCost: '15.00', licenseModel: 'site_license' } as any);
    expect(result.potentialSavings).toBeNull();
  });

  it('sets lowUtilization true when rate < 0.70', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 60 } as any);
    expect(result.lowUtilization).toBe(true);
  });

  it('sets lowUtilization false when rate >= 0.70', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 70 } as any);
    expect(result.lowUtilization).toBe(false);
  });
});

describe('SoftwareProductsService', () => {
  let service: SoftwareProductsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftwareProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<SoftwareProductsService>(SoftwareProductsService);
  });

  describe('findAll', () => {
    it('returns products with computed fields', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([baseProduct]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('utilizationRate');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns product with computed fields', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(baseProduct);
      const result = await service.findOne('sw-1');
      expect(result.id).toBe('sw-1');
      expect(result.utilizationRate).toBe(0.8);
    });
  });

  describe('create', () => {
    it('creates product and writes audit log', async () => {
      mockPrisma.softwareProduct.create.mockResolvedValue(baseProduct);
      await service.create({ name: 'Microsoft 365' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'SoftwareProduct' }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {}, 'actor')).rejects.toThrow(NotFoundException);
    });

    it('updates product and writes audit log', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(baseProduct);
      mockPrisma.softwareProduct.update.mockResolvedValue({ ...baseProduct, status: 'renewal_pending' });
      await service.update('sw-1', { status: 'renewal_pending' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'SoftwareProduct' }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes by setting status to terminated and writes audit log', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(baseProduct);
      mockPrisma.softwareProduct.update.mockResolvedValue({ ...baseProduct, status: 'terminated' });
      await service.remove('sw-1', 'actor-id');
      expect(mockPrisma.softwareProduct.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'terminated' }) }),
      );
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'SoftwareProduct', entityId: 'sw-1' }),
      );
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd apps/api && pnpm test -- --testPathPattern="software-products.service" --verbose
```

Expected: FAIL — `Cannot find module './software-products.service'`

- [ ] **Step 3: Create DTOs**

```typescript
// apps/api/src/modules/software-products/dto/create-software-product.dto.ts
import { IsString, IsOptional, IsEnum, IsInt, IsNumberString, IsDateString, IsUUID, IsBoolean } from 'class-validator';
import { LicenseModel, SoftwareStatus, RecommendedAction, FundingType } from '@prisma/client';

export class CreateSoftwareProductDto {
  @IsString()
  name: string;

  @IsOptional() @IsUUID()
  vendorId?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsEnum(LicenseModel)
  licenseModel?: string;

  @IsOptional() @IsInt()
  qtyPurchased?: number;

  @IsOptional() @IsInt()
  qtyAssigned?: number;

  @IsOptional() @IsInt()
  qtyActivelyUsed?: number;

  @IsOptional() @IsNumberString()
  unitCost?: string;

  @IsOptional() @IsNumberString()
  annualCost?: string;

  @IsOptional() @IsString()
  billingFrequency?: string;

  @IsOptional() @IsDateString()
  contractStartDate?: string;

  @IsOptional() @IsDateString()
  contractEndDate?: string;

  @IsOptional() @IsDateString()
  renewalDate?: string;

  @IsOptional() @IsInt()
  noticePeriodDays?: number;

  @IsOptional() @IsBoolean()
  autoRenewal?: boolean;

  @IsOptional() @IsEnum(SoftwareStatus)
  status?: string;

  @IsOptional() @IsEnum(RecommendedAction)
  recommendedAction?: string;

  @IsOptional() @IsEnum(FundingType)
  fundingType?: string;

  @IsOptional() @IsUUID()
  departmentId?: string;

  @IsOptional() @IsString()
  businessOwner?: string;

  @IsOptional() @IsString()
  technicalOwner?: string;

  @IsOptional() @IsString()
  budgetOwner?: string;

  @IsOptional() @IsString()
  strategicValue?: string;

  @IsOptional() @IsString()
  riskIfNotRenewed?: string;

  @IsOptional() @IsString()
  notes?: string;
}
```

```typescript
// apps/api/src/modules/software-products/dto/update-software-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSoftwareProductDto } from './create-software-product.dto';

export class UpdateSoftwareProductDto extends PartialType(CreateSoftwareProductDto) {}
```

- [ ] **Step 4: Create the service**

```typescript
// apps/api/src/modules/software-products/software-products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { SoftwareProduct } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateSoftwareProductDto } from './dto/create-software-product.dto';
import { UpdateSoftwareProductDto } from './dto/update-software-product.dto';

export type SoftwareProductWithComputed = SoftwareProduct & {
  utilizationRate: number | null;
  unusedLicenses: number | null;
  potentialSavings: number | null;
  lowUtilization: boolean;
};

export function computeUtilization(product: SoftwareProduct): SoftwareProductWithComputed {
  const { qtyPurchased, qtyActivelyUsed, unitCost, licenseModel } = product;
  if (!qtyPurchased) {
    return { ...product, utilizationRate: null, unusedLicenses: null, potentialSavings: null, lowUtilization: false };
  }
  const utilizationRate = (qtyActivelyUsed ?? 0) / qtyPurchased;
  const unusedLicenses = qtyPurchased - (qtyActivelyUsed ?? 0);
  const perUnitModels = ['per_user', 'per_device'];
  const potentialSavings =
    perUnitModels.includes(licenseModel ?? '') && unitCost ? unusedLicenses * Number(unitCost) : null;
  return { ...product, utilizationRate, unusedLicenses, potentialSavings, lowUtilization: utilizationRate < 0.7 };
}

@Injectable()
export class SoftwareProductsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(filters?: { status?: string; departmentId?: string; vendorId?: string }): Promise<SoftwareProductWithComputed[]> {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.vendorId) where.vendorId = filters.vendorId;
    const products = await this.prisma.softwareProduct.findMany({ where, orderBy: { name: 'asc' } });
    return products.map(computeUtilization);
  }

  async findOne(id: string): Promise<SoftwareProductWithComputed> {
    const product = await this.prisma.softwareProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`SoftwareProduct ${id} not found`);
    return computeUtilization(product);
  }

  async create(dto: CreateSoftwareProductDto, actorId: string): Promise<SoftwareProductWithComputed> {
    const product = await this.prisma.softwareProduct.create({
      data: {
        ...dto,
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
      } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'SoftwareProduct',
      entityId: product.id,
      newValue: { name: product.name },
    });
    return computeUtilization(product);
  }

  async update(id: string, dto: UpdateSoftwareProductDto, actorId: string): Promise<SoftwareProductWithComputed> {
    const existing = await this.findOne(id);
    const product = await this.prisma.softwareProduct.update({
      where: { id },
      data: {
        ...dto,
        contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
        contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
      } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'SoftwareProduct',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: product.status },
    });
    return computeUtilization(product);
  }

  async remove(id: string, actorId: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.prisma.softwareProduct.update({
      where: { id },
      data: { status: 'terminated' } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'SoftwareProduct',
      entityId: id,
    });
    return { deleted: true };
  }
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd apps/api && pnpm test -- --testPathPattern="software-products.service" --verbose
```

Expected: PASS — 14 tests passing.

- [ ] **Step 6: Create the controller**

```typescript
// apps/api/src/modules/software-products/software-products.controller.ts
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSoftwareProductDto } from './dto/create-software-product.dto';
import { UpdateSoftwareProductDto } from './dto/update-software-product.dto';
import { SoftwareProductsService } from './software-products.service';

@Controller('software-products')
export class SoftwareProductsController {
  constructor(private service: SoftwareProductsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.service.findAll({ status, departmentId, vendorId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateSoftwareProductDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.create(dto, user!.id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSoftwareProductDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.service.update(id, dto, user!.id);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | undefined) {
    return this.service.remove(id, user!.id);
  }
}
```

- [ ] **Step 7: Create the module**

```typescript
// apps/api/src/modules/software-products/software-products.module.ts
import { Module } from '@nestjs/common';
import { SoftwareProductsController } from './software-products.controller';
import { SoftwareProductsService } from './software-products.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [SoftwareProductsController],
  providers: [SoftwareProductsService],
})
export class SoftwareProductsModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/software-products/
git commit -m "feat: add SoftwareProducts NestJS module with TDD"
```

---

### Task 6: Contracts NestJS Module (TDD)

**Files:**
- Create: `apps/api/src/modules/contracts/dto/create-contract.dto.ts`
- Create: `apps/api/src/modules/contracts/dto/update-contract.dto.ts`
- Create: `apps/api/src/modules/contracts/contracts.service.spec.ts`
- Create: `apps/api/src/modules/contracts/contracts.service.ts`
- Create: `apps/api/src/modules/contracts/contracts.controller.ts`
- Create: `apps/api/src/modules/contracts/contracts.module.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/api/src/modules/contracts/contracts.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractsService, computeContractDeadlines } from './contracts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  contract: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockAuditLog = { log: jest.fn() };

const futureDate = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
};

const baseContract = {
  id: 'ctr-1',
  name: 'Microsoft Enterprise Agreement',
  vendorId: null,
  contractType: 'software_subscription',
  hardwareAssetId: null,
  softwareProductId: null,
  startDate: null,
  endDate: null,
  renewalDate: futureDate(60),
  noticePeriodDays: 30,
  cancellationDeadlineOverride: null,
  autoRenewal: false,
  annualCost: '50000.00',
  renewalCost: null,
  escalationPct: null,
  approvalStatus: 'not_reviewed',
  documentLink: null,
  departmentId: null,
  businessOwner: null,
  technicalOwner: null,
  budgetOwner: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('computeContractDeadlines', () => {
  it('computes cancellationDeadline from renewalDate - noticePeriodDays', () => {
    const renewalDate = futureDate(60);
    const result = computeContractDeadlines({ ...baseContract, renewalDate, noticePeriodDays: 30 } as any);
    expect(result.cancellationDeadline).toBeDefined();
    // deadline should be ~30 days from now
    const expected = new Date(renewalDate);
    expected.setDate(expected.getDate() - 30);
    expect(result.cancellationDeadline!.toDateString()).toBe(expected.toDateString());
  });

  it('uses cancellationDeadlineOverride when set', () => {
    const override = futureDate(10);
    const result = computeContractDeadlines({ ...baseContract, cancellationDeadlineOverride: override } as any);
    expect(result.cancellationDeadline).toEqual(override);
  });

  it('still computes daysUntilRenewal from renewalDate even when override is set', () => {
    const renewalDate = futureDate(60);
    const override = futureDate(10);
    const result = computeContractDeadlines({ ...baseContract, renewalDate, cancellationDeadlineOverride: override } as any);
    expect(result.daysUntilRenewal).toBeGreaterThan(55);
    expect(result.daysUntilRenewal).toBeLessThan(65);
  });

  it('returns null daysUntilRenewal when renewalDate is null', () => {
    const result = computeContractDeadlines({ ...baseContract, renewalDate: null } as any);
    expect(result.daysUntilRenewal).toBeNull();
    expect(result.urgency).toBeNull();
  });

  it('sets urgency red when daysUntilRenewal < 30', () => {
    const result = computeContractDeadlines({ ...baseContract, renewalDate: futureDate(15) } as any);
    expect(result.urgency).toBe('red');
  });

  it('sets urgency amber when daysUntilRenewal is 30–89', () => {
    const result = computeContractDeadlines({ ...baseContract, renewalDate: futureDate(60) } as any);
    expect(result.urgency).toBe('amber');
  });

  it('sets urgency green when daysUntilRenewal >= 90', () => {
    const result = computeContractDeadlines({ ...baseContract, renewalDate: futureDate(120) } as any);
    expect(result.urgency).toBe('green');
  });

  it('returns null cancellationDeadline when renewalDate or noticePeriodDays is missing', () => {
    const result = computeContractDeadlines({ ...baseContract, renewalDate: null, noticePeriodDays: null } as any);
    expect(result.cancellationDeadline).toBeNull();
  });
});

describe('ContractsService', () => {
  let service: ContractsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<ContractsService>(ContractsService);
  });

  describe('findAll', () => {
    it('returns contracts with computed fields', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([baseContract]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('cancellationDeadline');
      expect(result[0]).toHaveProperty('urgency');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns contract with computed fields', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(baseContract);
      const result = await service.findOne('ctr-1');
      expect(result.id).toBe('ctr-1');
      expect(result.urgency).toBe('amber');
    });
  });

  describe('create', () => {
    it('throws BadRequestException when both hardwareAssetId and softwareProductId are set', async () => {
      await expect(
        service.create(
          { name: 'Test', contractType: 'other', hardwareAssetId: 'hw-1', softwareProductId: 'sw-1' } as any,
          'actor',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates contract and writes audit log', async () => {
      mockPrisma.contract.create.mockResolvedValue(baseContract);
      await service.create({ name: 'Test', contractType: 'other' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'Contract' }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {}, 'actor')).rejects.toThrow(NotFoundException);
    });

    it('updates contract and writes audit log', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(baseContract);
      mockPrisma.contract.update.mockResolvedValue({ ...baseContract, approvalStatus: 'approved' });
      await service.update('ctr-1', { approvalStatus: 'approved' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'Contract' }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes contract and writes audit log', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(baseContract);
      mockPrisma.contract.delete.mockResolvedValue(baseContract);
      await service.remove('ctr-1', 'actor-id');
      expect(mockPrisma.contract.delete).toHaveBeenCalledWith({ where: { id: 'ctr-1' } });
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'Contract', entityId: 'ctr-1' }),
      );
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd apps/api && pnpm test -- --testPathPattern="contracts.service" --verbose
```

Expected: FAIL — `Cannot find module './contracts.service'`

- [ ] **Step 3: Create DTOs**

```typescript
// apps/api/src/modules/contracts/dto/create-contract.dto.ts
import { IsString, IsOptional, IsEnum, IsInt, IsNumberString, IsDateString, IsUUID, IsBoolean } from 'class-validator';
import { ContractType, ApprovalStatus } from '@prisma/client';

export class CreateContractDto {
  @IsString()
  name: string;

  @IsEnum(ContractType)
  contractType: string;

  @IsOptional() @IsUUID()
  vendorId?: string;

  @IsOptional() @IsUUID()
  hardwareAssetId?: string;

  @IsOptional() @IsUUID()
  softwareProductId?: string;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsDateString()
  renewalDate?: string;

  @IsOptional() @IsInt()
  noticePeriodDays?: number;

  @IsOptional() @IsDateString()
  cancellationDeadlineOverride?: string;

  @IsOptional() @IsBoolean()
  autoRenewal?: boolean;

  @IsOptional() @IsNumberString()
  annualCost?: string;

  @IsOptional() @IsNumberString()
  renewalCost?: string;

  @IsOptional() @IsNumberString()
  escalationPct?: string;

  @IsOptional() @IsEnum(ApprovalStatus)
  approvalStatus?: string;

  @IsOptional() @IsString()
  documentLink?: string;

  @IsOptional() @IsUUID()
  departmentId?: string;

  @IsOptional() @IsString()
  businessOwner?: string;

  @IsOptional() @IsString()
  technicalOwner?: string;

  @IsOptional() @IsString()
  budgetOwner?: string;

  @IsOptional() @IsString()
  notes?: string;
}
```

```typescript
// apps/api/src/modules/contracts/dto/update-contract.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateContractDto } from './create-contract.dto';

export class UpdateContractDto extends PartialType(CreateContractDto) {}
```

- [ ] **Step 4: Create the service**

```typescript
// apps/api/src/modules/contracts/contracts.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Contract } from '@prisma/client';
import { subDays, differenceInDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

export type ContractWithComputed = Contract & {
  cancellationDeadline: Date | null;
  daysUntilRenewal: number | null;
  urgency: 'red' | 'amber' | 'green' | null;
};

export function computeContractDeadlines(contract: Contract): ContractWithComputed {
  const today = new Date();
  const cancellationDeadline =
    contract.cancellationDeadlineOverride ??
    (contract.renewalDate && contract.noticePeriodDays
      ? subDays(contract.renewalDate, contract.noticePeriodDays)
      : null);
  const daysUntilRenewal = contract.renewalDate ? differenceInDays(contract.renewalDate, today) : null;
  const urgency =
    daysUntilRenewal === null ? null : daysUntilRenewal < 30 ? 'red' : daysUntilRenewal < 90 ? 'amber' : 'green';
  return { ...contract, cancellationDeadline, daysUntilRenewal, urgency };
}

@Injectable()
export class ContractsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(filters?: { contractType?: string; approvalStatus?: string; vendorId?: string }): Promise<ContractWithComputed[]> {
    const where: Record<string, unknown> = {};
    if (filters?.contractType) where.contractType = filters.contractType;
    if (filters?.approvalStatus) where.approvalStatus = filters.approvalStatus;
    if (filters?.vendorId) where.vendorId = filters.vendorId;
    const contracts = await this.prisma.contract.findMany({ where, orderBy: { renewalDate: 'asc' } });
    return contracts.map(computeContractDeadlines);
  }

  async findOne(id: string): Promise<ContractWithComputed> {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return computeContractDeadlines(contract);
  }

  async create(dto: CreateContractDto, actorId: string): Promise<ContractWithComputed> {
    if (dto.hardwareAssetId && dto.softwareProductId) {
      throw new BadRequestException('A contract can be linked to either a hardware asset or a software product, not both.');
    }
    const contract = await this.prisma.contract.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
        cancellationDeadlineOverride: dto.cancellationDeadlineOverride
          ? new Date(dto.cancellationDeadlineOverride)
          : undefined,
      } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Contract',
      entityId: contract.id,
      newValue: { name: contract.name },
    });
    return computeContractDeadlines(contract);
  }

  async update(id: string, dto: UpdateContractDto, actorId: string): Promise<ContractWithComputed> {
    const existing = await this.findOne(id);
    const contract = await this.prisma.contract.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
        cancellationDeadlineOverride: dto.cancellationDeadlineOverride
          ? new Date(dto.cancellationDeadlineOverride)
          : undefined,
      } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Contract',
      entityId: id,
      oldValue: { approvalStatus: existing.approvalStatus },
      newValue: { approvalStatus: contract.approvalStatus },
    });
    return computeContractDeadlines(contract);
  }

  async remove(id: string, actorId: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.prisma.contract.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Contract',
      entityId: id,
    });
    return { deleted: true };
  }
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd apps/api && pnpm test -- --testPathPattern="contracts.service" --verbose
```

Expected: PASS — 16 tests passing.

- [ ] **Step 6: Create the controller**

```typescript
// apps/api/src/modules/contracts/contracts.controller.ts
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractsService } from './contracts.service';

@Controller('contracts')
export class ContractsController {
  constructor(private service: ContractsService) {}

  @Get()
  findAll(
    @Query('contractType') contractType?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.service.findAll({ contractType, approvalStatus, vendorId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateContractDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.create(dto, user!.id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.service.update(id, dto, user!.id);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | undefined) {
    return this.service.remove(id, user!.id);
  }
}
```

- [ ] **Step 7: Create the module**

```typescript
// apps/api/src/modules/contracts/contracts.module.ts
import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/contracts/
git commit -m "feat: add Contracts NestJS module with TDD"
```

---

### Task 7: Register Modules in AppModule + Full Test Run

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Register the three new modules**

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Run the full test suite**

```bash
cd apps/api && pnpm test --verbose
```

Expected: All tests pass. Hardware assets: 14 tests, Software products: 14 tests, Contracts: 16 tests, plus all Phase 1 tests.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat: register HardwareAssetsModule, SoftwareProductsModule, ContractsModule in AppModule"
```

---

### Task 8: Seed Data

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Add Phase 2 seed records**

Append the following to `apps/api/prisma/seed.ts`, inside the `main()` function before the `console.log('Seed complete.')` line:

```typescript
  // Phase 2 seed data
  console.log('Seeding Phase 2 data...');

  const hwLaptop = await prisma.hardwareAsset.upsert({
    where: { id: 'hw-laptop-000000000000' },
    update: {},
    create: {
      id: 'hw-laptop-000000000000',
      assetTag: 'LAP-001',
      assetType: 'laptop',
      manufacturer: 'Dell',
      model: 'Latitude 5540',
      serialNumber: 'SN123456',
      purchaseDate: new Date('2022-03-01'),
      purchaseCost: '1200.00',
      usefulLifeYears: 4,
      warrantyEndDate: new Date('2025-03-01'),
      lifecycleStatus: 'active',
      criticality: 'medium',
      fundingType: 'capex',
      locationId: 'loc-main-00000000000',
      departmentId: 'dept-it-000000000000',
      vendorId: 'vnd-dl-000000000000',
      businessOwner: 'IT Manager',
      notes: 'Primary laptop for IT staff',
    },
  });

  const hwServer = await prisma.hardwareAsset.upsert({
    where: { id: 'hw-server-00000000000' },
    update: {},
    create: {
      id: 'hw-server-00000000000',
      assetTag: 'SRV-001',
      assetType: 'server',
      manufacturer: 'HPE',
      model: 'ProLiant DL380',
      serialNumber: 'SN789012',
      purchaseDate: new Date('2018-06-01'),
      purchaseCost: '8500.00',
      usefulLifeYears: 5,
      warrantyEndDate: new Date('2021-06-01'),
      supportEndDate: new Date('2023-06-01'),
      lifecycleStatus: 'due_for_replacement',
      criticality: 'mission_critical',
      fundingType: 'capex',
      locationId: 'loc-dc-0000000000000',
      departmentId: 'dept-it-000000000000',
      vendorId: 'vnd-hpe-0000000000',
      notes: 'Primary file server — past support end date',
    },
  });

  await prisma.hardwareAsset.upsert({
    where: { id: 'hw-retired-0000000000' },
    update: {},
    create: {
      id: 'hw-retired-0000000000',
      assetTag: 'LAP-OLD-001',
      assetType: 'laptop',
      manufacturer: 'Lenovo',
      model: 'ThinkPad X1',
      purchaseDate: new Date('2016-01-01'),
      usefulLifeYears: 4,
      lifecycleStatus: 'retired',
      criticality: 'low',
      fundingType: 'capex',
      departmentId: 'dept-it-000000000000',
      vendorId: 'vnd-len-0000000000',
      notes: 'Retired — replaced by Dell Latitude',
    },
  });

  console.log('Created 3 hardware assets');

  const swM365 = await prisma.softwareProduct.upsert({
    where: { id: 'sw-m365-000000000000' },
    update: {},
    create: {
      id: 'sw-m365-000000000000',
      name: 'Microsoft 365',
      vendorId: 'vnd-ms-000000000000',
      category: 'Productivity',
      licenseModel: 'per_user',
      qtyPurchased: 120,
      qtyAssigned: 115,
      qtyActivelyUsed: 98,
      unitCost: '22.00',
      annualCost: '31680.00',
      billingFrequency: 'annual',
      renewalDate: new Date('2026-09-01'),
      noticePeriodDays: 60,
      autoRenewal: true,
      status: 'active',
      fundingType: 'opex',
      departmentId: 'dept-it-000000000000',
      businessOwner: 'CTO',
      notes: 'Enterprise-wide Microsoft 365 subscription',
    },
  });

  await prisma.softwareProduct.upsert({
    where: { id: 'sw-zoom-000000000000' },
    update: {},
    create: {
      id: 'sw-zoom-000000000000',
      name: 'Zoom',
      vendorId: 'vnd-zmr-0000000000',
      category: 'Communications',
      licenseModel: 'per_user',
      qtyPurchased: 80,
      qtyAssigned: 80,
      qtyActivelyUsed: 45,
      unitCost: '14.99',
      annualCost: '14390.40',
      billingFrequency: 'annual',
      renewalDate: new Date('2026-07-15'),
      noticePeriodDays: 30,
      autoRenewal: false,
      status: 'renewal_pending',
      recommendedAction: 'renew_with_reduction',
      fundingType: 'opex',
      departmentId: 'dept-it-000000000000',
      businessOwner: 'IT Manager',
      notes: 'Low utilization (56%) — consider reducing seat count at renewal',
    },
  });

  await prisma.softwareProduct.upsert({
    where: { id: 'sw-sfdc-000000000000' },
    update: {},
    create: {
      id: 'sw-sfdc-000000000000',
      name: 'Salesforce CRM',
      vendorId: 'vnd-sal-0000000000',
      category: 'CRM',
      licenseModel: 'per_user',
      qtyPurchased: 25,
      qtyAssigned: 25,
      qtyActivelyUsed: 24,
      unitCost: '150.00',
      annualCost: '45000.00',
      billingFrequency: 'annual',
      renewalDate: new Date('2027-01-01'),
      noticePeriodDays: 90,
      autoRenewal: false,
      status: 'active',
      recommendedAction: 'renew_as_is',
      fundingType: 'opex',
      departmentId: 'dept-op-000000000000',
      businessOwner: 'VP Sales',
      strategicValue: 'Core revenue operations platform',
      notes: 'High utilization — mission critical for sales team',
    },
  });

  console.log('Created 3 software products');

  await prisma.contract.upsert({
    where: { id: 'ctr-hpe-00000000000' },
    update: {},
    create: {
      id: 'ctr-hpe-00000000000',
      name: 'HPE Server Maintenance Agreement',
      vendorId: 'vnd-hpe-0000000000',
      contractType: 'maintenance_agreement',
      hardwareAssetId: 'hw-server-00000000000',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2025-06-30'),
      renewalDate: new Date('2025-06-30'),
      noticePeriodDays: 45,
      autoRenewal: false,
      annualCost: '3500.00',
      approvalStatus: 'approved',
      departmentId: 'dept-it-000000000000',
      businessOwner: 'IT Manager',
      notes: 'Annual maintenance for primary server',
    },
  });

  await prisma.contract.upsert({
    where: { id: 'ctr-ms-000000000000' },
    update: {},
    create: {
      id: 'ctr-ms-000000000000',
      name: 'Microsoft 365 Enterprise Agreement',
      vendorId: 'vnd-ms-000000000000',
      contractType: 'software_subscription',
      softwareProductId: 'sw-m365-000000000000',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2026-08-31'),
      renewalDate: new Date('2026-09-01'),
      noticePeriodDays: 60,
      autoRenewal: true,
      annualCost: '31680.00',
      approvalStatus: 'approved',
      departmentId: 'dept-it-000000000000',
      businessOwner: 'CTO',
      notes: 'Multi-year Microsoft 365 enterprise agreement',
    },
  });

  console.log('Created 2 contracts');
```

- [ ] **Step 2: Run the seed**

```bash
cd apps/api && pnpm db:seed
```

Expected output includes:
```
Seeding Phase 2 data...
Created 3 hardware assets
Created 3 software products
Created 2 contracts
Seed complete.
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat: add Phase 2a seed data — hardware assets, software products, contracts"
```

---

### Task 9: Sidebar Update + Route Rename

**Files:**
- Modify: `apps/web/components/layout/sidebar.tsx`
- Delete: `apps/web/app/(protected)/assets/page.tsx`

- [ ] **Step 1: Update the sidebar**

Replace the full contents of `apps/web/components/layout/sidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Monitor,
  Package,
  FileText,
  Settings,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Hardware', href: '/hardware', icon: Monitor },
  { label: 'Software', href: '/software', icon: Package },
  { label: 'Contracts', href: '/contracts', icon: FileText },
  { label: 'Settings', href: '/settings/users', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0">
      <div className="px-4 py-5 border-b border-slate-700">
        <span className="text-lg font-semibold tracking-tight text-white">LifecycleIQ</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors',
              pathname.startsWith(href)
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Delete the old assets placeholder**

```bash
rm apps/web/app/\(protected\)/assets/page.tsx
rmdir apps/web/app/\(protected\)/assets/
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/layout/sidebar.tsx
git rm apps/web/app/\(protected\)/assets/page.tsx
git commit -m "feat: update sidebar nav — Hardware/Software/Contracts, remove assets placeholder"
```

---

### Task 10: Hardware Frontend Pages + Server Actions

**Files:**
- Create: `apps/web/lib/actions/hardware-assets.ts`
- Create: `apps/web/app/(protected)/hardware/page.tsx`
- Create: `apps/web/app/(protected)/hardware/client.tsx`
- Create: `apps/web/app/(protected)/hardware/form.tsx`
- Create: `apps/web/app/(protected)/hardware/new/page.tsx`
- Create: `apps/web/app/(protected)/hardware/[id]/page.tsx`

- [ ] **Step 1: Create server actions**

```typescript
// apps/web/lib/actions/hardware-assets.ts
'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { HardwareAsset, CreateHardwareAssetInput, UpdateHardwareAssetInput } from '@lifecycleiq/shared';

export async function getHardwareAssets(): Promise<HardwareAsset[]> {
  return apiServer('/api/v1/hardware-assets');
}

export async function getHardwareAsset(id: string): Promise<HardwareAsset> {
  return apiServer(`/api/v1/hardware-assets/${id}`);
}

export async function createHardwareAsset(data: CreateHardwareAssetInput): Promise<HardwareAsset> {
  const asset = await apiServer<HardwareAsset>('/api/v1/hardware-assets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/hardware');
  return asset;
}

export async function updateHardwareAsset(id: string, data: UpdateHardwareAssetInput): Promise<HardwareAsset> {
  const asset = await apiServer<HardwareAsset>(`/api/v1/hardware-assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/hardware');
  revalidatePath(`/hardware/${id}`);
  return asset;
}

export async function deleteHardwareAsset(id: string): Promise<void> {
  await apiServer(`/api/v1/hardware-assets/${id}`, { method: 'DELETE' });
  revalidatePath('/hardware');
}
```

- [ ] **Step 2: Create the list page (server component)**

```tsx
// apps/web/app/(protected)/hardware/page.tsx
import Link from 'next/link';
import { getHardwareAssets } from '@/lib/actions/hardware-assets';
import { HardwareList } from './client';

export default async function HardwarePage() {
  const assets = await getHardwareAssets();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Hardware Assets</h1>
        <Link
          href="/hardware/new"
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700"
        >
          Add Asset
        </Link>
      </div>
      <HardwareList initialData={assets} />
    </div>
  );
}
```

- [ ] **Step 3: Create the list client component**

```tsx
// apps/web/app/(protected)/hardware/client.tsx
'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { deleteHardwareAsset } from '@/lib/actions/hardware-assets';
import type { HardwareAsset } from '@lifecycleiq/shared';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  planned: 'bg-blue-100 text-blue-800',
  ordered: 'bg-blue-100 text-blue-800',
  spare: 'bg-gray-100 text-gray-800',
  in_repair: 'bg-yellow-100 text-yellow-800',
  due_for_replacement: 'bg-orange-100 text-orange-800',
  deferred: 'bg-yellow-100 text-yellow-800',
  retired: 'bg-gray-200 text-gray-500',
  disposed: 'bg-red-100 text-red-800',
};

export function HardwareList({ initialData }: { initialData: HardwareAsset[] }) {
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteHardwareAsset(id);
      setData((prev) => prev.filter((a) => a.id !== id));
    });
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No hardware assets yet.{' '}
        <Link href="/hardware/new" className="text-slate-900 underline">
          Add the first one.
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Asset Tag', 'Type', 'Manufacturer / Model', 'Location', 'Dept', 'Replacement Year', 'Status', 'Flags', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((asset) => (
            <tr key={asset.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">{asset.assetTag ?? '—'}</td>
              <td className="px-4 py-3 capitalize">{asset.assetType.replace(/_/g, ' ')}</td>
              <td className="px-4 py-3">
                {[asset.manufacturer, asset.model].filter(Boolean).join(' ') || '—'}
              </td>
              <td className="px-4 py-3 text-gray-500">{asset.locationId ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{asset.departmentId ?? '—'}</td>
              <td className="px-4 py-3">{asset.replacementYear ?? '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[asset.lifecycleStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                  {asset.lifecycleStatus.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 flex gap-1 flex-wrap">
                {asset.warrantyExpired && (
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Warranty Exp.</span>
                )}
                {asset.unsupported && (
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">Unsupported</span>
                )}
                {asset.highRisk && (
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">High Risk</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-xs space-x-3">
                <Link href={`/hardware/${asset.id}`} className="text-slate-700 hover:text-slate-900 font-medium">
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(asset.id)}
                  disabled={pending}
                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create the shared form component**

```tsx
// apps/web/app/(protected)/hardware/form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createHardwareAsset, updateHardwareAsset } from '@/lib/actions/hardware-assets';
import type { HardwareAsset } from '@lifecycleiq/shared';
import type { Department, Location, Vendor, User } from '@lifecycleiq/shared';

interface Props {
  asset?: HardwareAsset;
  departments: Department[];
  locations: Location[];
  vendors: Vendor[];
  users: User[];
}

const ASSET_TYPES = [
  'laptop','desktop','tablet','server','storage','network_switch',
  'wireless_access_point','firewall','ups','printer','mfp_copier',
  'classroom_display','projector','av_equipment','phone','camera','iot_device','other',
];
const LIFECYCLE_STATUSES = [
  'planned','ordered','active','spare','in_repair',
  'due_for_replacement','deferred','retired','disposed',
];
const CRITICALITIES = ['low','medium','high','mission_critical'];
const FUNDING_TYPES = ['capex','opex'];

export function HardwareForm({ asset, departments, locations, vendors, users }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function fmtDate(d: Date | string | null | undefined) {
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string) || undefined;
    const getNum = (k: string) => { const v = fd.get(k); return v ? Number(v) : undefined; };

    const data = {
      assetType: fd.get('assetType') as string,
      assetTag: get('assetTag'),
      manufacturer: get('manufacturer'),
      model: get('model'),
      serialNumber: get('serialNumber'),
      purchaseDate: get('purchaseDate'),
      purchaseCost: get('purchaseCost'),
      replacementCost: get('replacementCost'),
      usefulLifeYears: getNum('usefulLifeYears'),
      replacementYearOverride: getNum('replacementYearOverride'),
      warrantyEndDate: get('warrantyEndDate'),
      supportEndDate: get('supportEndDate'),
      lifecycleStatus: get('lifecycleStatus'),
      criticality: get('criticality'),
      fundingType: get('fundingType'),
      locationId: get('locationId'),
      departmentId: get('departmentId'),
      vendorId: get('vendorId'),
      assignedUserId: get('assignedUserId'),
      businessOwner: get('businessOwner'),
      technicalOwner: get('technicalOwner'),
      notes: get('notes'),
    };

    startTransition(async () => {
      try {
        if (asset) {
          await updateHardwareAsset(asset.id, data);
        } else {
          await createHardwareAsset(data);
        }
        router.push('/hardware');
      } catch (err: any) {
        setError(err.message ?? 'An error occurred');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Tag</label>
            <input name="assetTag" defaultValue={asset?.assetTag ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type *</label>
            <select name="assetType" required defaultValue={asset?.assetType ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">Select type</option>
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <input name="manufacturer" defaultValue={asset?.manufacturer ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input name="model" defaultValue={asset?.model ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
            <input name="serialNumber" defaultValue={asset?.serialNumber ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Lifecycle</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lifecycle Status</label>
            <select name="lifecycleStatus" defaultValue={asset?.lifecycleStatus ?? 'active'} className="w-full rounded-md border-gray-300 text-sm">
              {LIFECYCLE_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Criticality</label>
            <select name="criticality" defaultValue={asset?.criticality ?? 'medium'} className="w-full rounded-md border-gray-300 text-sm">
              {CRITICALITIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
            <input type="date" name="purchaseDate" defaultValue={fmtDate(asset?.purchaseDate)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (years)</label>
            <input type="number" name="usefulLifeYears" defaultValue={asset?.usefulLifeYears ?? ''} min="1" max="20" className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Replacement Year Override</label>
            <input type="number" name="replacementYearOverride" defaultValue={asset?.replacementYearOverride ?? ''} min="2000" max="2100" className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funding Type</label>
            <select name="fundingType" defaultValue={asset?.fundingType ?? 'capex'} className="w-full rounded-md border-gray-300 text-sm">
              {FUNDING_TYPES.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Financials</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost ($)</label>
            <input type="number" step="0.01" name="purchaseCost" defaultValue={asset?.purchaseCost ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Replacement Cost ($)</label>
            <input type="number" step="0.01" name="replacementCost" defaultValue={asset?.replacementCost ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Dates</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warranty End Date</label>
            <input type="date" name="warrantyEndDate" defaultValue={fmtDate(asset?.warrantyEndDate)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Support End Date</label>
            <input type="date" name="supportEndDate" defaultValue={fmtDate(asset?.supportEndDate)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Ownership</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select name="locationId" defaultValue={asset?.locationId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select name="departmentId" defaultValue={asset?.departmentId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select name="vendorId" defaultValue={asset?.vendorId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned User</label>
            <select name="assignedUserId" defaultValue={asset?.assignedUserId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Owner</label>
            <input name="businessOwner" defaultValue={asset?.businessOwner ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technical Owner</label>
            <input name="technicalOwner" defaultValue={asset?.technicalOwner ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea name="notes" rows={3} defaultValue={asset?.notes ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
      </section>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50">
          {pending ? 'Saving…' : (asset ? 'Save Changes' : 'Create Asset')}
        </button>
        <button type="button" onClick={() => router.push('/hardware')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create the New page**

```tsx
// apps/web/app/(protected)/hardware/new/page.tsx
import { getDepartments } from '@/lib/actions/departments';
import { getLocations } from '@/lib/actions/locations';
import { getVendors } from '@/lib/actions/vendors';
import { getUsers } from '@/lib/actions/users';
import { HardwareForm } from '../form';

export default async function NewHardwarePage() {
  const [departments, locations, vendors, users] = await Promise.all([
    getDepartments(),
    getLocations(),
    getVendors(),
    getUsers(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Add Hardware Asset</h1>
      </div>
      <HardwareForm departments={departments} locations={locations} vendors={vendors} users={users} />
    </div>
  );
}
```

- [ ] **Step 6: Create the Detail/Edit page**

```tsx
// apps/web/app/(protected)/hardware/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getDepartments } from '@/lib/actions/departments';
import { getLocations } from '@/lib/actions/locations';
import { getVendors } from '@/lib/actions/vendors';
import { getUsers } from '@/lib/actions/users';
import { getHardwareAsset } from '@/lib/actions/hardware-assets';
import { HardwareForm } from '../form';

interface Props { params: { id: string } }

export default async function HardwareDetailPage({ params }: Props) {
  const [asset, departments, locations, vendors, users] = await Promise.all([
    getHardwareAsset(params.id).catch(() => null),
    getDepartments(),
    getLocations(),
    getVendors(),
    getUsers(),
  ]);

  if (!asset) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {[asset.manufacturer, asset.model].filter(Boolean).join(' ') || asset.assetTag || 'Hardware Asset'}
        </h1>
        {asset.assetTag && <p className="text-sm text-gray-500 mt-1">Tag: {asset.assetTag}</p>}
        <div className="flex gap-2 mt-2">
          {asset.highRisk && <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">High Risk</span>}
          {asset.warrantyExpired && <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Warranty Expired</span>}
          {asset.unsupported && <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">Unsupported</span>}
        </div>
      </div>
      <HardwareForm asset={asset} departments={departments} locations={locations} vendors={vendors} users={users} />
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/actions/hardware-assets.ts apps/web/app/\(protected\)/hardware/
git commit -m "feat: add hardware frontend pages and server actions"
```

---

### Task 11: Software Frontend Pages + Server Actions

**Files:**
- Create: `apps/web/lib/actions/software-products.ts`
- Modify: `apps/web/app/(protected)/software/page.tsx`
- Create: `apps/web/app/(protected)/software/client.tsx`
- Create: `apps/web/app/(protected)/software/form.tsx`
- Create: `apps/web/app/(protected)/software/new/page.tsx`
- Create: `apps/web/app/(protected)/software/[id]/page.tsx`

- [ ] **Step 1: Create server actions**

```typescript
// apps/web/lib/actions/software-products.ts
'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { SoftwareProduct, CreateSoftwareProductInput, UpdateSoftwareProductInput } from '@lifecycleiq/shared';

export async function getSoftwareProducts(): Promise<SoftwareProduct[]> {
  return apiServer('/api/v1/software-products');
}

export async function getSoftwareProduct(id: string): Promise<SoftwareProduct> {
  return apiServer(`/api/v1/software-products/${id}`);
}

export async function createSoftwareProduct(data: CreateSoftwareProductInput): Promise<SoftwareProduct> {
  const product = await apiServer<SoftwareProduct>('/api/v1/software-products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/software');
  return product;
}

export async function updateSoftwareProduct(id: string, data: UpdateSoftwareProductInput): Promise<SoftwareProduct> {
  const product = await apiServer<SoftwareProduct>(`/api/v1/software-products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/software');
  revalidatePath(`/software/${id}`);
  return product;
}

export async function deleteSoftwareProduct(id: string): Promise<void> {
  await apiServer(`/api/v1/software-products/${id}`, { method: 'DELETE' });
  revalidatePath('/software');
}
```

- [ ] **Step 2: Replace the software list page**

```tsx
// apps/web/app/(protected)/software/page.tsx
import Link from 'next/link';
import { getSoftwareProducts } from '@/lib/actions/software-products';
import { SoftwareList } from './client';

export default async function SoftwarePage() {
  const products = await getSoftwareProducts();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Software Products</h1>
        <Link
          href="/software/new"
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700"
        >
          Add Software
        </Link>
      </div>
      <SoftwareList initialData={products} />
    </div>
  );
}
```

- [ ] **Step 3: Create the list client component**

```tsx
// apps/web/app/(protected)/software/client.tsx
'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { deleteSoftwareProduct } from '@/lib/actions/software-products';
import type { SoftwareProduct } from '@lifecycleiq/shared';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  renewal_pending: 'bg-orange-100 text-orange-800',
  sunset_planned: 'bg-red-100 text-red-800',
  replaced: 'bg-gray-100 text-gray-500',
  terminated: 'bg-gray-200 text-gray-400',
};

function UtilizationBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-gray-400">—</span>;
  const pct = Math.round(rate * 100);
  const color = rate < 0.7 ? 'text-red-600' : 'text-green-600';
  return <span className={`font-medium ${color}`}>{pct}%</span>;
}

export function SoftwareList({ initialData }: { initialData: SoftwareProduct[] }) {
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSoftwareProduct(id);
      setData((prev) => prev.filter((p) => p.id !== id));
    });
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No software products yet.{' '}
        <Link href="/software/new" className="text-slate-900 underline">Add the first one.</Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Name', 'Vendor', 'License Model', 'Qty Purchased', 'Utilization', 'Annual Cost', 'Renewal Date', 'Status', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{product.name}</td>
              <td className="px-4 py-3 text-gray-500">{product.vendorId ?? '—'}</td>
              <td className="px-4 py-3 text-gray-500">{product.licenseModel?.replace(/_/g, ' ') ?? '—'}</td>
              <td className="px-4 py-3">{product.qtyPurchased ?? '—'}</td>
              <td className="px-4 py-3"><UtilizationBadge rate={product.utilizationRate} /></td>
              <td className="px-4 py-3">{product.annualCost ? `$${Number(product.annualCost).toLocaleString()}` : '—'}</td>
              <td className="px-4 py-3 text-gray-500">
                {product.renewalDate ? new Date(product.renewalDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[product.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {product.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-xs space-x-3">
                <Link href={`/software/${product.id}`} className="text-slate-700 hover:text-slate-900 font-medium">Edit</Link>
                <button onClick={() => handleDelete(product.id)} disabled={pending} className="text-red-600 hover:text-red-800 disabled:opacity-50">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create the form component**

```tsx
// apps/web/app/(protected)/software/form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createSoftwareProduct, updateSoftwareProduct } from '@/lib/actions/software-products';
import type { SoftwareProduct, Vendor, Department } from '@lifecycleiq/shared';

interface Props {
  product?: SoftwareProduct;
  vendors: Vendor[];
  departments: Department[];
}

const LICENSE_MODELS = ['per_user','per_device','site_license','fte_based','concurrent_user','consumption_based','flat_annual','multi_year_agreement','other'];
const STATUSES = ['active','trial','under_review','renewal_pending','sunset_planned','replaced','terminated'];
const RECOMMENDED_ACTIONS = ['renew_as_is','renew_with_reduction','expand','renegotiate','replace','consolidate','terminate','monitor','escalate'];
const FUNDING_TYPES = ['opex','capex'];

export function SoftwareForm({ product, vendors, departments }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function fmtDate(d: Date | string | null | undefined) {
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string) || undefined;
    const getNum = (k: string) => { const v = fd.get(k); return v ? Number(v) : undefined; };

    const data = {
      name: fd.get('name') as string,
      vendorId: get('vendorId'),
      category: get('category'),
      description: get('description'),
      licenseModel: get('licenseModel'),
      qtyPurchased: getNum('qtyPurchased'),
      qtyAssigned: getNum('qtyAssigned'),
      qtyActivelyUsed: getNum('qtyActivelyUsed'),
      unitCost: get('unitCost'),
      annualCost: get('annualCost'),
      billingFrequency: get('billingFrequency'),
      contractStartDate: get('contractStartDate'),
      contractEndDate: get('contractEndDate'),
      renewalDate: get('renewalDate'),
      noticePeriodDays: getNum('noticePeriodDays'),
      autoRenewal: fd.get('autoRenewal') === 'on',
      status: get('status'),
      recommendedAction: get('recommendedAction'),
      fundingType: get('fundingType'),
      departmentId: get('departmentId'),
      businessOwner: get('businessOwner'),
      technicalOwner: get('technicalOwner'),
      budgetOwner: get('budgetOwner'),
      strategicValue: get('strategicValue'),
      riskIfNotRenewed: get('riskIfNotRenewed'),
      notes: get('notes'),
    };

    startTransition(async () => {
      try {
        if (product) {
          await updateSoftwareProduct(product.id, data);
        } else {
          await createSoftwareProduct(data);
        }
        router.push('/software');
      } catch (err: any) {
        setError(err.message ?? 'An error occurred');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required defaultValue={product?.name ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select name="vendorId" defaultValue={product?.vendorId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input name="category" defaultValue={product?.category ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={2} defaultValue={product?.description ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Licensing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Model</label>
            <select name="licenseModel" defaultValue={product?.licenseModel ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">Select model</option>
              {LICENSE_MODELS.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Frequency</label>
            <input name="billingFrequency" defaultValue={product?.billingFrequency ?? ''} placeholder="e.g. annual, monthly" className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qty Purchased</label>
            <input type="number" name="qtyPurchased" defaultValue={product?.qtyPurchased ?? ''} min="0" className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qty Assigned</label>
            <input type="number" name="qtyAssigned" defaultValue={product?.qtyAssigned ?? ''} min="0" className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qty Actively Used</label>
            <input type="number" name="qtyActivelyUsed" defaultValue={product?.qtyActivelyUsed ?? ''} min="0" className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
            <input type="number" step="0.01" name="unitCost" defaultValue={product?.unitCost ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Cost ($)</label>
            <input type="number" step="0.01" name="annualCost" defaultValue={product?.annualCost ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Dates</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Start</label>
            <input type="date" name="contractStartDate" defaultValue={fmtDate(product?.contractStartDate)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract End</label>
            <input type="date" name="contractEndDate" defaultValue={fmtDate(product?.contractEndDate)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
            <input type="date" name="renewalDate" defaultValue={fmtDate(product?.renewalDate)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (days)</label>
            <input type="number" name="noticePeriodDays" defaultValue={product?.noticePeriodDays ?? ''} min="0" className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" name="autoRenewal" id="swAutoRenewal" defaultChecked={product?.autoRenewal ?? false} className="rounded border-gray-300" />
            <label htmlFor="swAutoRenewal" className="text-sm text-gray-700">Auto-Renewal</label>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Classification</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" defaultValue={product?.status ?? 'active'} className="w-full rounded-md border-gray-300 text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recommended Action</label>
            <select name="recommendedAction" defaultValue={product?.recommendedAction ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {RECOMMENDED_ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funding Type</label>
            <select name="fundingType" defaultValue={product?.fundingType ?? 'opex'} className="w-full rounded-md border-gray-300 text-sm">
              {FUNDING_TYPES.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Strategic Value</label>
            <textarea name="strategicValue" rows={2} defaultValue={product?.strategicValue ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk if Not Renewed</label>
            <textarea name="riskIfNotRenewed" rows={2} defaultValue={product?.riskIfNotRenewed ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Ownership</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select name="departmentId" defaultValue={product?.departmentId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Owner</label>
            <input name="businessOwner" defaultValue={product?.businessOwner ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technical Owner</label>
            <input name="technicalOwner" defaultValue={product?.technicalOwner ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget Owner</label>
            <input name="budgetOwner" defaultValue={product?.budgetOwner ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea name="notes" rows={3} defaultValue={product?.notes ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
      </section>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50">
          {pending ? 'Saving…' : (product ? 'Save Changes' : 'Create Software')}
        </button>
        <button type="button" onClick={() => router.push('/software')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create New page**

```tsx
// apps/web/app/(protected)/software/new/page.tsx
import { getDepartments } from '@/lib/actions/departments';
import { getVendors } from '@/lib/actions/vendors';
import { SoftwareForm } from '../form';

export default async function NewSoftwarePage() {
  const [departments, vendors] = await Promise.all([getDepartments(), getVendors()]);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Add Software Product</h1>
      </div>
      <SoftwareForm departments={departments} vendors={vendors} />
    </div>
  );
}
```

- [ ] **Step 6: Create Detail/Edit page**

```tsx
// apps/web/app/(protected)/software/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getDepartments } from '@/lib/actions/departments';
import { getVendors } from '@/lib/actions/vendors';
import { getSoftwareProduct } from '@/lib/actions/software-products';
import { SoftwareForm } from '../form';

interface Props { params: { id: string } }

export default async function SoftwareDetailPage({ params }: Props) {
  const [product, departments, vendors] = await Promise.all([
    getSoftwareProduct(params.id).catch(() => null),
    getDepartments(),
    getVendors(),
  ]);
  if (!product) notFound();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
        {product.lowUtilization && (
          <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
            Low Utilization ({product.utilizationRate !== null ? `${Math.round(product.utilizationRate * 100)}%` : '—'})
          </span>
        )}
      </div>
      <SoftwareForm product={product} departments={departments} vendors={vendors} />
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/actions/software-products.ts apps/web/app/\(protected\)/software/
git commit -m "feat: add software frontend pages and server actions"
```

---

### Task 12: Contracts Frontend Pages + Server Actions

**Files:**
- Create: `apps/web/lib/actions/contracts.ts`
- Modify: `apps/web/app/(protected)/contracts/page.tsx`
- Create: `apps/web/app/(protected)/contracts/client.tsx`
- Create: `apps/web/app/(protected)/contracts/form.tsx`
- Create: `apps/web/app/(protected)/contracts/new/page.tsx`
- Create: `apps/web/app/(protected)/contracts/[id]/page.tsx`

- [ ] **Step 1: Create server actions**

```typescript
// apps/web/lib/actions/contracts.ts
'use server';

import { revalidatePath } from 'next/cache';
import { apiServer } from '@/lib/api';
import type { Contract, CreateContractInput, UpdateContractInput } from '@lifecycleiq/shared';

export async function getContracts(): Promise<Contract[]> {
  return apiServer('/api/v1/contracts');
}

export async function getContract(id: string): Promise<Contract> {
  return apiServer(`/api/v1/contracts/${id}`);
}

export async function createContract(data: CreateContractInput): Promise<Contract> {
  const contract = await apiServer<Contract>('/api/v1/contracts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  revalidatePath('/contracts');
  return contract;
}

export async function updateContract(id: string, data: UpdateContractInput): Promise<Contract> {
  const contract = await apiServer<Contract>(`/api/v1/contracts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  revalidatePath('/contracts');
  revalidatePath(`/contracts/${id}`);
  return contract;
}

export async function deleteContract(id: string): Promise<void> {
  await apiServer(`/api/v1/contracts/${id}`, { method: 'DELETE' });
  revalidatePath('/contracts');
}
```

- [ ] **Step 2: Replace the contracts list page**

```tsx
// apps/web/app/(protected)/contracts/page.tsx
import Link from 'next/link';
import { getContracts } from '@/lib/actions/contracts';
import { ContractList } from './client';

export default async function ContractsPage() {
  const contracts = await getContracts();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Contracts</h1>
        <Link href="/contracts/new" className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700">
          Add Contract
        </Link>
      </div>
      <ContractList initialData={contracts} />
    </div>
  );
}
```

- [ ] **Step 3: Create the list client component**

```tsx
// apps/web/app/(protected)/contracts/client.tsx
'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { deleteContract } from '@/lib/actions/contracts';
import type { Contract } from '@lifecycleiq/shared';

const APPROVAL_COLORS: Record<string, string> = {
  not_reviewed: 'bg-gray-100 text-gray-600',
  review_required: 'bg-yellow-100 text-yellow-800',
  pending_quote: 'bg-blue-100 text-blue-800',
  pending_approval: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  deferred: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-200 text-gray-400',
};

const URGENCY_COLORS: Record<string, string> = {
  red: 'text-red-600 font-bold',
  amber: 'text-yellow-600 font-medium',
  green: 'text-green-600',
};

export function ContractList({ initialData }: { initialData: Contract[] }) {
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContract(id);
      setData((prev) => prev.filter((c) => c.id !== id));
    });
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No contracts yet.{' '}
        <Link href="/contracts/new" className="text-slate-900 underline">Add the first one.</Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['Name', 'Type', 'Annual Cost', 'Renewal Date', 'Cancel Deadline', 'Days Until Renewal', 'Approval', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((contract) => (
            <tr key={contract.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{contract.name}</td>
              <td className="px-4 py-3 text-gray-500">{contract.contractType.replace(/_/g, ' ')}</td>
              <td className="px-4 py-3">{contract.annualCost ? `$${Number(contract.annualCost).toLocaleString()}` : '—'}</td>
              <td className="px-4 py-3 text-gray-500">
                {contract.renewalDate ? new Date(contract.renewalDate).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {contract.cancellationDeadline ? new Date(contract.cancellationDeadline).toLocaleDateString() : '—'}
              </td>
              <td className={`px-4 py-3 ${contract.urgency ? URGENCY_COLORS[contract.urgency] : 'text-gray-400'}`}>
                {contract.daysUntilRenewal !== null ? `${contract.daysUntilRenewal}d` : '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${APPROVAL_COLORS[contract.approvalStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                  {contract.approvalStatus.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-xs space-x-3">
                <Link href={`/contracts/${contract.id}`} className="text-slate-700 hover:text-slate-900 font-medium">Edit</Link>
                <button onClick={() => handleDelete(contract.id)} disabled={pending} className="text-red-600 hover:text-red-800 disabled:opacity-50">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create the form component**

```tsx
// apps/web/app/(protected)/contracts/form.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createContract, updateContract } from '@/lib/actions/contracts';
import type { Contract, Vendor, Department, HardwareAsset, SoftwareProduct } from '@lifecycleiq/shared';

interface Props {
  contract?: Contract;
  vendors: Vendor[];
  departments: Department[];
  hardwareAssets: HardwareAsset[];
  softwareProducts: SoftwareProduct[];
}

const CONTRACT_TYPES = [
  'software_subscription','saas_agreement','hardware_support','maintenance_agreement',
  'managed_service','telecom','internet_circuit','cloud_service',
  'professional_service','warranty','other',
];
const APPROVAL_STATUSES = [
  'not_reviewed','review_required','pending_quote','pending_approval',
  'approved','rejected','deferred','cancelled',
];

export function ContractForm({ contract, vendors, departments, hardwareAssets, softwareProducts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function fmtDate(d: Date | string | null | undefined) {
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string) || undefined;
    const getNum = (k: string) => { const v = fd.get(k); return v ? Number(v) : undefined; };

    const hardwareAssetId = get('hardwareAssetId');
    const softwareProductId = get('softwareProductId');

    if (hardwareAssetId && softwareProductId) {
      setError('A contract can only link to one asset — either hardware or software, not both.');
      return;
    }

    const data = {
      name: fd.get('name') as string,
      contractType: fd.get('contractType') as string,
      vendorId: get('vendorId'),
      hardwareAssetId,
      softwareProductId,
      startDate: get('startDate'),
      endDate: get('endDate'),
      renewalDate: get('renewalDate'),
      noticePeriodDays: getNum('noticePeriodDays'),
      cancellationDeadlineOverride: get('cancellationDeadlineOverride'),
      autoRenewal: fd.get('autoRenewal') === 'on',
      annualCost: get('annualCost'),
      renewalCost: get('renewalCost'),
      escalationPct: get('escalationPct'),
      approvalStatus: get('approvalStatus'),
      documentLink: get('documentLink'),
      departmentId: get('departmentId'),
      businessOwner: get('businessOwner'),
      technicalOwner: get('technicalOwner'),
      budgetOwner: get('budgetOwner'),
      notes: get('notes'),
    };

    startTransition(async () => {
      try {
        if (contract) {
          await updateContract(contract.id, data);
        } else {
          await createContract(data);
        }
        router.push('/contracts');
      } catch (err: any) {
        setError(err.message ?? 'An error occurred');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required defaultValue={contract?.name ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type *</label>
            <select name="contractType" required defaultValue={contract?.contractType ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">Select type</option>
              {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select name="vendorId" defaultValue={contract?.vendorId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Linked Asset (optional — pick at most one)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hardware Asset</label>
            <select name="hardwareAssetId" defaultValue={contract?.hardwareAssetId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {hardwareAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.assetTag ?? a.id} — {[a.manufacturer, a.model].filter(Boolean).join(' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Software Product</label>
            <select name="softwareProductId" defaultValue={contract?.softwareProductId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {softwareProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Dates</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" name="startDate" defaultValue={fmtDate(contract?.startDate)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" name="endDate" defaultValue={fmtDate(contract?.endDate)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
            <input type="date" name="renewalDate" defaultValue={fmtDate(contract?.renewalDate)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (days)</label>
            <input type="number" name="noticePeriodDays" defaultValue={contract?.noticePeriodDays ?? ''} min="0" className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Deadline Override</label>
            <input type="date" name="cancellationDeadlineOverride" defaultValue={fmtDate(contract?.cancellationDeadlineOverride)} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" name="autoRenewal" id="ctrAutoRenewal" defaultChecked={contract?.autoRenewal ?? false} className="rounded border-gray-300" />
            <label htmlFor="ctrAutoRenewal" className="text-sm text-gray-700">Auto-Renewal</label>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Financials</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Cost ($)</label>
            <input type="number" step="0.01" name="annualCost" defaultValue={contract?.annualCost ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Cost ($)</label>
            <input type="number" step="0.01" name="renewalCost" defaultValue={contract?.renewalCost ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escalation %</label>
            <input type="number" step="0.01" name="escalationPct" defaultValue={contract?.escalationPct ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Ownership & Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select name="departmentId" defaultValue={contract?.departmentId ?? ''} className="w-full rounded-md border-gray-300 text-sm">
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
            <select name="approvalStatus" defaultValue={contract?.approvalStatus ?? 'not_reviewed'} className="w-full rounded-md border-gray-300 text-sm">
              {APPROVAL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Owner</label>
            <input name="businessOwner" defaultValue={contract?.businessOwner ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technical Owner</label>
            <input name="technicalOwner" defaultValue={contract?.technicalOwner ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget Owner</label>
            <input name="budgetOwner" defaultValue={contract?.budgetOwner ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Document Link</label>
            <input name="documentLink" type="url" defaultValue={contract?.documentLink ?? ''} placeholder="https://..." className="w-full rounded-md border-gray-300 text-sm" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Notes</h2>
        <textarea name="notes" rows={3} defaultValue={contract?.notes ?? ''} className="w-full rounded-md border-gray-300 text-sm" />
      </section>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="px-4 py-2 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50">
          {pending ? 'Saving…' : (contract ? 'Save Changes' : 'Create Contract')}
        </button>
        <button type="button" onClick={() => router.push('/contracts')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create New page**

```tsx
// apps/web/app/(protected)/contracts/new/page.tsx
import { getDepartments } from '@/lib/actions/departments';
import { getVendors } from '@/lib/actions/vendors';
import { getHardwareAssets } from '@/lib/actions/hardware-assets';
import { getSoftwareProducts } from '@/lib/actions/software-products';
import { ContractForm } from '../form';

export default async function NewContractPage() {
  const [departments, vendors, hardwareAssets, softwareProducts] = await Promise.all([
    getDepartments(),
    getVendors(),
    getHardwareAssets(),
    getSoftwareProducts(),
  ]);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Add Contract</h1>
      </div>
      <ContractForm departments={departments} vendors={vendors} hardwareAssets={hardwareAssets} softwareProducts={softwareProducts} />
    </div>
  );
}
```

- [ ] **Step 6: Create Detail/Edit page**

```tsx
// apps/web/app/(protected)/contracts/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getDepartments } from '@/lib/actions/departments';
import { getVendors } from '@/lib/actions/vendors';
import { getHardwareAssets } from '@/lib/actions/hardware-assets';
import { getSoftwareProducts } from '@/lib/actions/software-products';
import { getContract } from '@/lib/actions/contracts';
import { ContractForm } from '../form';

interface Props { params: { id: string } }

export default async function ContractDetailPage({ params }: Props) {
  const [contract, departments, vendors, hardwareAssets, softwareProducts] = await Promise.all([
    getContract(params.id).catch(() => null),
    getDepartments(),
    getVendors(),
    getHardwareAssets(),
    getSoftwareProducts(),
  ]);
  if (!contract) notFound();

  const urgencyColors = { red: 'bg-red-100 text-red-800', amber: 'bg-yellow-100 text-yellow-800', green: 'bg-green-100 text-green-800' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{contract.name}</h1>
        {contract.urgency && (
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mt-1 ${urgencyColors[contract.urgency]}`}>
            {contract.daysUntilRenewal}d until renewal
          </span>
        )}
      </div>
      <ContractForm contract={contract} departments={departments} vendors={vendors} hardwareAssets={hardwareAssets} softwareProducts={softwareProducts} />
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/actions/contracts.ts apps/web/app/\(protected\)/contracts/
git commit -m "feat: add contracts frontend pages and server actions"
```

---

### Task 13: Final TypeScript Check + Test Run

**Files:** No changes — verification only.

- [ ] **Step 1: Run full API test suite**

```bash
cd apps/api && pnpm test --verbose
```

Expected: All tests pass. No failures.

- [ ] **Step 2: Check TypeScript across all packages**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: No errors.

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors. If there are import errors for new shared types, ensure `packages/shared` was built or that the `moduleNameMapper` in tsconfig resolves the workspace package correctly.

- [ ] **Step 3: Start the API and verify it boots cleanly**

```bash
cd apps/api && pnpm dev
```

Expected: `Application is running on: http://[::1]:3001` with no errors in stdout.

- [ ] **Step 4: Start the web app and verify pages load**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000` and verify:
- Sidebar shows: Hardware, Software, Contracts, Settings
- `/hardware` loads the list (shows seed data)
- `/hardware/new` renders the create form
- Creating a hardware asset works and redirects to list
- `/software` shows seed products with utilization percentages
- Low-utilization rows (< 70%) show red percentage
- `/contracts` shows contracts with days-until-renewal
- Contracts with < 30 days show red count
- Contracts with 30–89 days show yellow count

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Phase 2a complete — hardware, software, contracts CRUD with computed fields"
```
