# Phase 2b: CSV Import / Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSV import (dry-run preview + confirm) and CSV export to the three Phase 2a modules (Hardware Assets, Software Products, Contracts), plus a rebuilt /imports frontend page and Download CSV buttons on each module's list page.

**Architecture:** A shared `CsvService` handles CSV parsing and serialization. Each of the three CRUD modules gains `importPreview`, `importConfirm`, and `exportCsv` service methods, two new POST endpoints and one GET endpoint on each controller. The frontend gets a new server actions file (`import-export.ts`) and a rebuilt `/imports` page with module selector, file upload, dry-run preview table, and confirm flow. Export buttons are added to existing list-page client components.

**Tech Stack:** NestJS (multer for file upload, papaparse for CSV parsing, class-transformer for DTO coercion), Next.js 14 App Router (FormData server actions, Blob URL for download), Prisma `$transaction` for atomic batch imports.

**Worktree note:** Before starting, set up a worktree on a new branch `feature/phase-2b` from `master`. The Phase 2a code is in `master` at `/Users/david/LifeCycleIQ_Claude`. Pull latest first: `git pull origin master`.

---

## File Map

| File | Action |
|------|--------|
| `apps/api/src/modules/import-export/csv.service.ts` | Create |
| `apps/api/src/modules/import-export/csv.service.spec.ts` | Create |
| `apps/api/src/modules/import-export/import-export.module.ts` | Create |
| `apps/api/src/modules/hardware-assets/hardware-assets.service.ts` | Modify |
| `apps/api/src/modules/hardware-assets/hardware-assets.service.spec.ts` | Modify |
| `apps/api/src/modules/hardware-assets/hardware-assets.controller.ts` | Modify |
| `apps/api/src/modules/hardware-assets/hardware-assets.module.ts` | Modify |
| `apps/api/src/modules/software-products/software-products.service.ts` | Modify |
| `apps/api/src/modules/software-products/software-products.service.spec.ts` | Modify |
| `apps/api/src/modules/software-products/software-products.controller.ts` | Modify |
| `apps/api/src/modules/software-products/software-products.module.ts` | Modify |
| `apps/api/src/modules/contracts/contracts.service.ts` | Modify |
| `apps/api/src/modules/contracts/contracts.service.spec.ts` | Modify |
| `apps/api/src/modules/contracts/contracts.controller.ts` | Modify |
| `apps/api/src/modules/contracts/contracts.module.ts` | Modify |
| `apps/web/lib/actions/import-export.ts` | Create |
| `apps/web/app/(protected)/imports/page.tsx` | Rewrite |
| `apps/web/app/(protected)/imports/client.tsx` | Create |
| `apps/web/app/(protected)/hardware-assets/client.tsx` | Modify |
| `apps/web/app/(protected)/software-products/client.tsx` | Modify |
| `apps/web/app/(protected)/contracts/client.tsx` | Modify |
| `apps/web/public/templates/hardware-assets-template.csv` | Create |
| `apps/web/public/templates/software-products-template.csv` | Create |
| `apps/web/public/templates/contracts-template.csv` | Create |

**Spec correction for software products template:** The CSV template uses the DTO field names `licenseCount` and `usersCount` (not `qtyPurchased`/`qtyActivelyUsed`). The service maps `licenseCount → qtyPurchased` and `usersCount → qtyActivelyUsed` when writing to Prisma. The `unitCost` field is also excluded from the template as it's not in the DTO.

---

## Task 1: Install Dependencies + Worktree Setup

**Files:**
- `apps/api/package.json`

- [ ] **Step 1: Set up worktree from master**

```bash
cd /Users/david/LifeCycleIQ_Claude
git pull origin master
git worktree add .worktrees/phase-2b -b feature/phase-2b
cd .worktrees/phase-2b/apps/api
pnpm install
pnpm db:generate
```

- [ ] **Step 2: Install papaparse and type definitions**

```bash
# In .worktrees/phase-2b/apps/api
pnpm add papaparse
pnpm add -D @types/papaparse @types/multer
```

- [ ] **Step 3: Verify installation**

```bash
cat package.json | grep -E "papaparse|multer"
```

Expected output includes `"papaparse"` in dependencies and `"@types/papaparse"`, `"@types/multer"` in devDependencies.

- [ ] **Step 4: Run baseline tests**

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 89 passed, 89 total`

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/pnpm-lock.yaml
git commit -m "chore: install papaparse and multer types for CSV import/export"
```

---

## Task 2: CsvService (TDD) + ImportExportModule

**Files:**
- Create: `apps/api/src/modules/import-export/csv.service.spec.ts`
- Create: `apps/api/src/modules/import-export/csv.service.ts`
- Create: `apps/api/src/modules/import-export/import-export.module.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/import-export/csv.service.spec.ts`:

```typescript
import { CsvService } from './csv.service';

describe('CsvService', () => {
  let service: CsvService;

  beforeEach(() => {
    service = new CsvService();
  });

  describe('parse', () => {
    it('returns data rows from a valid CSV', () => {
      const csv = 'name,type\nFoo,bar\nBaz,qux';
      expect(service.parse(csv)).toEqual([
        { name: 'Foo', type: 'bar' },
        { name: 'Baz', type: 'qux' },
      ]);
    });

    it('strips comment rows starting with #', () => {
      const csv = '# comment line\nname,type\nFoo,bar';
      expect(service.parse(csv)).toEqual([{ name: 'Foo', type: 'bar' }]);
    });

    it('strips multiple comment rows', () => {
      const csv = '# line1\n# line2\nname,type\nFoo,bar';
      expect(service.parse(csv)).toEqual([{ name: 'Foo', type: 'bar' }]);
    });

    it('returns empty array for header-only CSV', () => {
      expect(service.parse('name,type')).toEqual([]);
    });

    it('skips empty lines', () => {
      const csv = 'name,type\nFoo,bar\n\nBaz,qux';
      expect(service.parse(csv)).toHaveLength(2);
    });

    it('handles quoted values containing commas', () => {
      const csv = 'name,type\n"Foo, Inc",bar';
      expect(service.parse(csv)[0].name).toBe('Foo, Inc');
    });
  });

  describe('serialize', () => {
    it('produces header row and data rows', () => {
      const result = service.serialize(
        [{ name: 'Foo', type: 'bar' }],
        ['name', 'type'],
      );
      expect(result).toBe('name,type\nFoo,bar');
    });

    it('quotes values containing commas', () => {
      const result = service.serialize(
        [{ name: 'Foo, Inc', type: 'bar' }],
        ['name', 'type'],
      );
      expect(result).toContain('"Foo, Inc"');
    });

    it('converts null and undefined to empty string', () => {
      const result = service.serialize(
        [{ name: null, type: undefined }] as any,
        ['name', 'type'],
      );
      expect(result).toBe('name,type\n,');
    });

    it('serializes boolean and number values as strings', () => {
      const result = service.serialize(
        [{ active: true, count: 42 }] as any,
        ['active', 'count'],
      );
      expect(result).toBe('active,count\ntrue,42');
    });
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest --testPathPattern="csv.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: `FAIL` — "Cannot find module './csv.service'"

- [ ] **Step 3: Implement CsvService**

Create `apps/api/src/modules/import-export/csv.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import Papa from 'papaparse';

export interface ImportPreview {
  totalRows: number;
  validRows: Record<string, string>[];
  invalidRows: { rowNumber: number; data: Record<string, string>; errors: string[] }[];
}

@Injectable()
export class CsvService {
  parse(csvString: string): Record<string, string>[] {
    const filtered = csvString
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
      .join('\n');
    const result = Papa.parse<Record<string, string>>(filtered, {
      header: true,
      skipEmptyLines: true,
    });
    return result.data;
  }

  serialize<T extends object>(records: T[], columns: (keyof T)[]): string {
    const header = columns.join(',');
    const rows = records.map((r) =>
      columns
        .map((col) => {
          const val = r[col];
          const str = val === null || val === undefined ? '' : String(val);
          return str.includes(',') || str.includes('\n') || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(','),
    );
    return [header, ...rows].join('\n');
  }
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest --testPathPattern="csv.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 10 passed, 10 total`

- [ ] **Step 5: Create ImportExportModule**

Create `apps/api/src/modules/import-export/import-export.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CsvService } from './csv.service';

@Module({
  providers: [CsvService],
  exports: [CsvService],
})
export class ImportExportModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/import-export/
git commit -m "feat: add CsvService with parse/serialize (TDD, 10 tests)"
```

---

## Task 3: Hardware Assets — Import (TDD)

**Files:**
- Modify: `apps/api/src/modules/hardware-assets/hardware-assets.service.ts`
- Modify: `apps/api/src/modules/hardware-assets/hardware-assets.service.spec.ts`
- Modify: `apps/api/src/modules/hardware-assets/hardware-assets.module.ts`
- Modify: `apps/api/src/modules/hardware-assets/hardware-assets.controller.ts`

**Context:** The existing service has `findAll`, `findOne`, `create`, `update`, `remove`. We're adding `importPreview` and `importConfirm`. The existing spec mocks `mockPrisma` and `mockAuditLog`. We need to add `mockCsvService` to the test setup and add `$transaction` + `findFirst` to `mockPrisma`.

- [ ] **Step 1: Add import tests to hardware-assets.service.spec.ts**

Open `apps/api/src/modules/hardware-assets/hardware-assets.service.spec.ts`. Add the following at the top of the file (update the existing mock block) and add new `describe` blocks at the bottom:

**Update the mock declarations at the top of the file** (keep all existing mock fields, add new ones):

```typescript
// Add these imports at the top of the existing file:
import { CsvService } from '../import-export/csv.service';
```

**Replace the existing `mockPrisma` declaration** with this expanded version:

```typescript
const mockPrisma = {
  hardwareAsset: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};
```

**Add `mockCsvService` after the existing `mockAuditLog`:**

```typescript
const mockCsvService = { parse: jest.fn(), serialize: jest.fn() };
```

**Update the existing `beforeEach` in `SoftwareProductsService` describe block** to include `CsvService` provider. The existing beforeEach looks like:

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    HardwareAssetsService,
    { provide: PrismaService, useValue: mockPrisma },
    { provide: AuditLogService, useValue: mockAuditLog },
  ],
}).compile();
```

Change it to:

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    HardwareAssetsService,
    { provide: PrismaService, useValue: mockPrisma },
    { provide: AuditLogService, useValue: mockAuditLog },
    { provide: CsvService, useValue: mockCsvService },
  ],
}).compile();
```

**Add these new test blocks at the bottom of the file** (after the existing `describe` blocks):

```typescript
describe('importPreview', () => {
  beforeEach(() => {
    mockCsvService.parse.mockReturnValue([
      { assetTag: 'HW-001', assetType: 'laptop', lifecycleStatus: 'active', criticality: 'medium' },
    ]);
    mockPrisma.hardwareAsset.findFirst.mockResolvedValue(null);
  });

  it('returns valid row for a well-formed CSV', async () => {
    const result = await service.importPreview('csv-string');
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(0);
  });

  it('flags missing required assetType', async () => {
    mockCsvService.parse.mockReturnValue([
      { assetTag: 'HW-001', assetType: '', lifecycleStatus: 'active', criticality: 'medium' },
    ]);
    const result = await service.importPreview('csv-string');
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors.some((e) => e.toLowerCase().includes('assettype'))).toBe(true);
  });

  it('flags invalid enum value for criticality', async () => {
    mockCsvService.parse.mockReturnValue([
      { assetTag: 'HW-001', assetType: 'laptop', lifecycleStatus: 'active', criticality: 'INVALID' },
    ]);
    const result = await service.importPreview('csv-string');
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors.some((e) => e.toLowerCase().includes('criticality'))).toBe(true);
  });

  it('flags duplicate assetTag', async () => {
    mockPrisma.hardwareAsset.findFirst.mockResolvedValue({ id: 'existing' });
    const result = await service.importPreview('csv-string');
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors[0]).toBe('assetTag: already exists');
  });

  it('separates valid and invalid rows in same CSV', async () => {
    mockCsvService.parse.mockReturnValue([
      { assetTag: 'HW-001', assetType: 'laptop', lifecycleStatus: 'active', criticality: 'medium' },
      { assetTag: 'HW-002', assetType: 'BADTYPE', lifecycleStatus: 'active', criticality: 'medium' },
    ]);
    mockPrisma.hardwareAsset.findFirst.mockResolvedValue(null);
    const result = await service.importPreview('csv-string');
    expect(result.totalRows).toBe(2);
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(1);
  });
});

describe('importConfirm', () => {
  it('creates all rows in a transaction and writes audit logs', async () => {
    const rows = [
      { assetTag: 'HW-001', assetType: 'laptop', lifecycleStatus: 'active', criticality: 'medium' },
    ];
    mockPrisma.$transaction.mockResolvedValue([{ ...baseAsset, id: 'hw-new' }]);
    const result = await service.importConfirm(rows, 'actor-id');
    expect(result.imported).toBe(1);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityType: 'HardwareAsset' }),
    );
  });
});
```

- [ ] **Step 2: Run tests — confirm new tests fail**

```bash
npx jest --testPathPattern="hardware-assets.service.spec" --no-coverage 2>&1 | tail -8
```

Expected: tests fail because `importPreview` and `importConfirm` are not yet defined on the service.

- [ ] **Step 3: Add importPreview and importConfirm to the service**

Open `apps/api/src/modules/hardware-assets/hardware-assets.service.ts`. Add imports at the top:

```typescript
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CsvService, ImportPreview } from '../import-export/csv.service';
```

Update the constructor to inject `CsvService`:

```typescript
constructor(
  private prisma: PrismaService,
  private auditLog: AuditLogService,
  private csvService: CsvService,
) {}
```

Add these methods to the `HardwareAssetsService` class (after `remove`):

```typescript
async importPreview(csvString: string): Promise<ImportPreview> {
  const rows = this.csvService.parse(csvString);
  const validRows: Record<string, string>[] = [];
  const invalidRows: { rowNumber: number; data: Record<string, string>; errors: string[] }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors: string[] = [];

    // Import-specific required field check (assetTag is optional in DTO but required for import)
    if (!row.assetTag) rowErrors.push('assetTag: required');

    // DTO validation with type coercion
    const dto = plainToInstance(CreateHardwareAssetDto, row, { enableImplicitConversion: true });
    const validationErrors = await validate(dto);
    for (const err of validationErrors) {
      rowErrors.push(...Object.values(err.constraints ?? {}));
    }

    // DB-level uniqueness check for assetTag
    if (!rowErrors.length && row.assetTag) {
      const existing = await this.prisma.hardwareAsset.findFirst({
        where: { assetTag: row.assetTag },
      });
      if (existing) rowErrors.push('assetTag: already exists');
    }

    if (rowErrors.length > 0) {
      invalidRows.push({ rowNumber: i + 1, data: row, errors: rowErrors });
    } else {
      validRows.push(row);
    }
  }

  return { totalRows: rows.length, validRows, invalidRows };
}

async importConfirm(
  rows: Record<string, string>[],
  actorId: string,
): Promise<{ imported: number }> {
  const dtos = rows.map((row) =>
    plainToInstance(CreateHardwareAssetDto, row, { enableImplicitConversion: true }),
  );

  const created = await this.prisma.$transaction(
    dtos.map((dto) =>
      this.prisma.hardwareAsset.create({
        data: {
          assetType: dto.assetType,
          assetTag: dto.assetTag,
          manufacturer: dto.manufacturer,
          model: dto.model,
          serialNumber: dto.serialNumber,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
          purchaseCost: dto.purchaseCost,
          usefulLifeYears: dto.usefulLifeYears,
          warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
          supportEndDate: dto.supportEndDate ? new Date(dto.supportEndDate) : undefined,
          lifecycleStatus: dto.lifecycleStatus,
          criticality: dto.criticality,
          fundingType: dto.fundingType,
          notes: dto.notes,
        },
      }),
    ),
  );

  for (const asset of created) {
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'HardwareAsset',
      entityId: asset.id,
    });
  }

  return { imported: created.length };
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest --testPathPattern="hardware-assets.service.spec" --no-coverage 2>&1 | tail -8
```

Expected: all tests pass (original 15 + 6 new import tests = 21 passing)

- [ ] **Step 5: Update HardwareAssetsModule to import ImportExportModule**

Open `apps/api/src/modules/hardware-assets/hardware-assets.module.ts` and replace its content:

```typescript
import { Module } from '@nestjs/common';
import { HardwareAssetsController } from './hardware-assets.controller';
import { HardwareAssetsService } from './hardware-assets.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ImportExportModule } from '../import-export/import-export.module';

@Module({
  imports: [AuditLogModule, ImportExportModule],
  controllers: [HardwareAssetsController],
  providers: [HardwareAssetsService],
})
export class HardwareAssetsModule {}
```

- [ ] **Step 6: Add import endpoints to the controller**

Open `apps/api/src/modules/hardware-assets/hardware-assets.controller.ts`. Add these imports:

```typescript
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
```

Add these two endpoints to the controller class. **Place them BEFORE the existing `@Get(':id')` and `@Post()` endpoints** to avoid routing conflicts:

```typescript
@Post('import')
@Roles(Role.Admin, Role.Editor)
@UseInterceptors(FileInterceptor('file'))
async importPreview(@UploadedFile() file: Express.Multer.File) {
  const csvString = file.buffer.toString('utf-8');
  return this.service.importPreview(csvString);
}

@Post('import/confirm')
@Roles(Role.Admin, Role.Editor)
async importConfirm(
  @Body() body: { rows: Record<string, string>[] },
  @CurrentUser() user: AuthUser | undefined,
) {
  return this.service.importConfirm(body.rows, user!.id);
}
```

- [ ] **Step 7: Run all tests to confirm nothing broke**

```bash
npx jest --no-coverage 2>&1 | tail -8
```

Expected: all tests pass

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/hardware-assets/ apps/api/src/modules/import-export/
git commit -m "feat: add hardware-assets import endpoints with TDD (6 new tests)"
```

---

## Task 4: Hardware Assets — Export (TDD)

**Files:**
- Modify: `apps/api/src/modules/hardware-assets/hardware-assets.service.ts`
- Modify: `apps/api/src/modules/hardware-assets/hardware-assets.service.spec.ts`
- Modify: `apps/api/src/modules/hardware-assets/hardware-assets.controller.ts`

- [ ] **Step 1: Add export test to hardware-assets.service.spec.ts**

Add this `describe` block after the existing `importConfirm` tests:

```typescript
describe('exportCsv', () => {
  it('returns a CSV string with headers including computed fields', async () => {
    mockPrisma.hardwareAsset.findMany.mockResolvedValue([baseAsset]);
    const csvResult = 'id,assetTag,replacementYear\nhw-1,TAG-001,2024';
    mockCsvService.serialize.mockReturnValue(csvResult);
    const result = await service.exportCsv();
    expect(typeof result).toBe('string');
    expect(mockCsvService.serialize).toHaveBeenCalled();
    // First arg is array of records with computed fields
    const serializeCall = mockCsvService.serialize.mock.calls[0];
    expect(serializeCall[0][0]).toHaveProperty('replacementYear');
    expect(serializeCall[0][0]).toHaveProperty('highRisk');
  });
});
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
npx jest --testPathPattern="hardware-assets.service.spec" --no-coverage 2>&1 | grep -E "FAIL|exportCsv"
```

Expected: test fails — `service.exportCsv is not a function`

- [ ] **Step 3: Add exportCsv method to the service**

Add this method to `HardwareAssetsService` (after `importConfirm`):

```typescript
async exportCsv(): Promise<string> {
  const assets = await this.findAll();
  const columns: (keyof (typeof assets)[0])[] = [
    'id', 'assetTag', 'assetType', 'lifecycleStatus', 'criticality',
    'manufacturer', 'model', 'serialNumber', 'purchaseDate', 'usefulLifeYears',
    'purchaseCost', 'warrantyEndDate', 'supportEndDate', 'notes',
    'replacementYear', 'warrantyExpired', 'unsupported', 'highRisk',
    'createdAt', 'updatedAt',
  ];
  return this.csvService.serialize(assets, columns);
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
npx jest --testPathPattern="hardware-assets.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: all tests pass

- [ ] **Step 5: Add export endpoint to controller**

Add this endpoint to the controller. **Place it BEFORE `@Get(':id')`** (important — 'export' must match before NestJS tries to parse it as a UUID):

```typescript
@Get('export')
@Roles(Role.Admin, Role.Editor)
async exportCsv(@Res() res: Response) {
  const csv = await this.service.exportCsv();
  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="hardware-assets-${date}.csv"`);
  res.send(csv);
}
```

- [ ] **Step 6: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/hardware-assets/
git commit -m "feat: add hardware-assets export endpoint with TDD"
```

---

## Task 5: Software Products — Import + Export (TDD)

**Files:**
- Modify: `apps/api/src/modules/software-products/software-products.service.ts`
- Modify: `apps/api/src/modules/software-products/software-products.service.spec.ts`
- Modify: `apps/api/src/modules/software-products/software-products.controller.ts`
- Modify: `apps/api/src/modules/software-products/software-products.module.ts`

**Context:** The `CreateSoftwareProductDto` uses `licenseCount` (maps to `qtyPurchased`) and `usersCount` (maps to `qtyActivelyUsed`). The CSV template uses these same field names. There is no `assetTag`-like uniqueness constraint, so no DB uniqueness check is needed in `importPreview`.

- [ ] **Step 1: Add import/export tests to software-products.service.spec.ts**

Open `apps/api/src/modules/software-products/software-products.service.spec.ts`. Make these changes:

**Add import at top:**
```typescript
import { CsvService } from '../import-export/csv.service';
```

**Add to existing mockPrisma** (add `$transaction` field):
```typescript
const mockPrisma = {
  softwareProduct: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};
```

**Add mockCsvService after mockAuditLog:**
```typescript
const mockCsvService = { parse: jest.fn(), serialize: jest.fn() };
```

**Update the providers array in beforeEach:**
```typescript
providers: [
  SoftwareProductsService,
  { provide: PrismaService, useValue: mockPrisma },
  { provide: AuditLogService, useValue: mockAuditLog },
  { provide: CsvService, useValue: mockCsvService },
],
```

**Add these new describe blocks at the bottom of the file:**

```typescript
describe('importPreview', () => {
  beforeEach(() => {
    mockCsvService.parse.mockReturnValue([
      { name: 'Microsoft 365', licenseModel: 'per_user', licenseCount: '50', usersCount: '42' },
    ]);
  });

  it('returns valid row for a well-formed CSV', async () => {
    const result = await service.importPreview('csv-string');
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(0);
  });

  it('flags missing required name', async () => {
    mockCsvService.parse.mockReturnValue([
      { name: '', licenseModel: 'per_user' },
    ]);
    const result = await service.importPreview('csv-string');
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors.some((e) => e.toLowerCase().includes('name'))).toBe(true);
  });

  it('flags invalid licenseModel enum', async () => {
    mockCsvService.parse.mockReturnValue([
      { name: 'App', licenseModel: 'INVALID' },
    ]);
    const result = await service.importPreview('csv-string');
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors.some((e) => e.toLowerCase().includes('licensemodel'))).toBe(true);
  });

  it('separates valid and invalid rows', async () => {
    mockCsvService.parse.mockReturnValue([
      { name: 'App A', licenseModel: 'per_user' },
      { name: '', licenseModel: 'per_user' },
    ]);
    const result = await service.importPreview('csv-string');
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(1);
  });
});

describe('importConfirm', () => {
  it('creates rows in a transaction and writes audit logs', async () => {
    const rows = [{ name: 'Microsoft 365', licenseModel: 'per_user' }];
    mockPrisma.$transaction.mockResolvedValue([{ ...baseProduct, id: 'sw-new' }]);
    const result = await service.importConfirm(rows, 'actor-id');
    expect(result.imported).toBe(1);
    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityType: 'SoftwareProduct' }),
    );
  });
});

describe('exportCsv', () => {
  it('returns a CSV string with computed utilization fields', async () => {
    mockPrisma.softwareProduct.findMany.mockResolvedValue([baseProduct]);
    const csvResult = 'id,name,utilizationRate\nsw-1,Microsoft 365,0.8';
    mockCsvService.serialize.mockReturnValue(csvResult);
    const result = await service.exportCsv();
    expect(typeof result).toBe('string');
    const serializeCall = mockCsvService.serialize.mock.calls[0];
    expect(serializeCall[0][0]).toHaveProperty('utilizationRate');
    expect(serializeCall[0][0]).toHaveProperty('lowUtilization');
  });
});
```

- [ ] **Step 2: Run tests — confirm new tests fail**

```bash
npx jest --testPathPattern="software-products.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: FAIL — methods not yet defined

- [ ] **Step 3: Add imports and constructor update to software-products.service.ts**

Open `apps/api/src/modules/software-products/software-products.service.ts`. Add:

```typescript
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CsvService, ImportPreview } from '../import-export/csv.service';
```

Update constructor:
```typescript
constructor(
  private prisma: PrismaService,
  private auditLog: AuditLogService,
  private csvService: CsvService,
) {}
```

Import `ImportPreview` from `csv.service` (it was defined there in Task 2):

The import line in Task 5 Step 3 above already covers this:
```typescript
import { CsvService, ImportPreview } from '../import-export/csv.service';
```

- [ ] **Step 4: Add importPreview, importConfirm, and exportCsv to the service**

Add these methods to `SoftwareProductsService` (after `remove`):

```typescript
async importPreview(csvString: string): Promise<ImportPreview> {
  const rows = this.csvService.parse(csvString);
  const validRows: Record<string, string>[] = [];
  const invalidRows: { rowNumber: number; data: Record<string, string>; errors: string[] }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dto = plainToInstance(CreateSoftwareProductDto, row, { enableImplicitConversion: true });
    const errors = await validate(dto);
    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: i + 1,
        data: row,
        errors: errors.flatMap((e) => Object.values(e.constraints ?? {})),
      });
    } else {
      validRows.push(row);
    }
  }

  return { totalRows: rows.length, validRows, invalidRows };
}

async importConfirm(
  rows: Record<string, string>[],
  actorId: string,
): Promise<{ imported: number }> {
  const dtos = rows.map((row) =>
    plainToInstance(CreateSoftwareProductDto, row, { enableImplicitConversion: true }),
  );

  const created = await this.prisma.$transaction(
    dtos.map((dto) =>
      this.prisma.softwareProduct.create({
        data: {
          name: dto.name,
          licenseModel: dto.licenseModel,
          qtyPurchased: dto.licenseCount,
          qtyActivelyUsed: dto.usersCount,
          annualCost: dto.annualCost,
          renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
          status: dto.status,
          recommendedAction: dto.recommendedAction,
          notes: dto.notes,
          departmentId: dto.departmentId,
          vendorId: dto.vendorId,
        },
      }),
    ),
  );

  for (const product of created) {
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'SoftwareProduct',
      entityId: product.id,
    });
  }

  return { imported: created.length };
}

async exportCsv(): Promise<string> {
  const products = await this.findAll();
  const columns: (keyof (typeof products)[0])[] = [
    'id', 'name', 'licenseModel', 'qtyPurchased', 'qtyActivelyUsed',
    'unitCost', 'annualCost', 'renewalDate', 'noticePeriodDays', 'autoRenewal',
    'status', 'recommendedAction', 'notes',
    'utilizationRate', 'unusedLicenses', 'potentialSavings', 'lowUtilization',
    'createdAt', 'updatedAt',
  ];
  return this.csvService.serialize(products, columns);
}
```

- [ ] **Step 5: Update SoftwareProductsModule**

Replace `apps/api/src/modules/software-products/software-products.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SoftwareProductsController } from './software-products.controller';
import { SoftwareProductsService } from './software-products.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ImportExportModule } from '../import-export/import-export.module';

@Module({
  imports: [AuditLogModule, ImportExportModule],
  controllers: [SoftwareProductsController],
  providers: [SoftwareProductsService],
})
export class SoftwareProductsModule {}
```

- [ ] **Step 6: Add import/export endpoints to software-products.controller.ts**

Open `apps/api/src/modules/software-products/software-products.controller.ts`. Add these imports:

```typescript
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
```

Add these endpoints **BEFORE `@Get(':id')` and `@Post()`**:

```typescript
@Post('import')
@Roles(Role.Admin, Role.Editor)
@UseInterceptors(FileInterceptor('file'))
async importPreview(@UploadedFile() file: Express.Multer.File) {
  const csvString = file.buffer.toString('utf-8');
  return this.service.importPreview(csvString);
}

@Post('import/confirm')
@Roles(Role.Admin, Role.Editor)
async importConfirm(
  @Body() body: { rows: Record<string, string>[] },
  @CurrentUser() user: AuthUser | undefined,
) {
  return this.service.importConfirm(body.rows, user!.id);
}

@Get('export')
@Roles(Role.Admin, Role.Editor)
async exportCsv(@Res() res: Response) {
  const csv = await this.service.exportCsv();
  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="software-products-${date}.csv"`);
  res.send(csv);
}
```

- [ ] **Step 7: Run tests — confirm all pass**

```bash
npx jest --testPathPattern="software-products.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: all tests pass (original 20 + 6 new = 26 passing)

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/software-products/
git commit -m "feat: add software-products import/export with TDD (6 new tests)"
```

---

## Task 6: Contracts — Import + Export (TDD)

**Files:**
- Modify: `apps/api/src/modules/contracts/contracts.service.ts`
- Modify: `apps/api/src/modules/contracts/contracts.service.spec.ts`
- Modify: `apps/api/src/modules/contracts/contracts.controller.ts`
- Modify: `apps/api/src/modules/contracts/contracts.module.ts`

**Context:** Contracts DTO requires `name` (string, not empty) and `contractType` (enum). `autoRenewal` is `@IsBoolean()` — `enableImplicitConversion: true` coerces `"true"`/`"false"` strings to booleans. No uniqueness constraint on `name`.

- [ ] **Step 1: Add import/export tests to contracts.service.spec.ts**

Open `apps/api/src/modules/contracts/contracts.service.spec.ts`. Make these changes:

**Add import:**
```typescript
import { CsvService } from '../import-export/csv.service';
```

**Add `$transaction` to existing mockPrisma:**
```typescript
const mockPrisma = {
  contract: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};
```

**Add mockCsvService:**
```typescript
const mockCsvService = { parse: jest.fn(), serialize: jest.fn() };
```

**Update providers in beforeEach:**
```typescript
providers: [
  ContractsService,
  { provide: PrismaService, useValue: mockPrisma },
  { provide: AuditLogService, useValue: mockAuditLog },
  { provide: CsvService, useValue: mockCsvService },
],
```

**Add these describe blocks at the bottom:**

```typescript
describe('importPreview', () => {
  beforeEach(() => {
    mockCsvService.parse.mockReturnValue([
      { name: 'Microsoft EA', contractType: 'enterprise_agreement', endDate: '2026-12-31', noticePeriodDays: '60', autoRenewal: 'false' },
    ]);
  });

  it('returns valid row for a well-formed CSV', async () => {
    const result = await service.importPreview('csv-string');
    expect(result.totalRows).toBe(1);
    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(0);
  });

  it('flags missing required name', async () => {
    mockCsvService.parse.mockReturnValue([
      { name: '', contractType: 'enterprise_agreement' },
    ]);
    const result = await service.importPreview('csv-string');
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors.some((e) => e.toLowerCase().includes('name'))).toBe(true);
  });

  it('flags invalid contractType enum', async () => {
    mockCsvService.parse.mockReturnValue([
      { name: 'Contract A', contractType: 'INVALID' },
    ]);
    const result = await service.importPreview('csv-string');
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors.some((e) => e.toLowerCase().includes('contracttype'))).toBe(true);
  });

  it('coerces autoRenewal string to boolean', async () => {
    mockCsvService.parse.mockReturnValue([
      { name: 'Contract B', contractType: 'maintenance', autoRenewal: 'true' },
    ]);
    const result = await service.importPreview('csv-string');
    expect(result.validRows).toHaveLength(1);
  });
});

describe('importConfirm', () => {
  it('creates rows in a transaction and writes audit logs', async () => {
    const rows = [{ name: 'Microsoft EA', contractType: 'enterprise_agreement' }];
    mockPrisma.$transaction.mockResolvedValue([{ ...baseContract, id: 'ct-new' }]);
    const result = await service.importConfirm(rows, 'actor-id');
    expect(result.imported).toBe(1);
    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityType: 'Contract' }),
    );
  });
});

describe('exportCsv', () => {
  it('returns a CSV string with computed deadline fields', async () => {
    mockPrisma.contract.findMany.mockResolvedValue([baseContract]);
    const csvResult = 'id,name,daysUntilRenewal\nct-1,Microsoft EA,200';
    mockCsvService.serialize.mockReturnValue(csvResult);
    const result = await service.exportCsv();
    expect(typeof result).toBe('string');
    const serializeCall = mockCsvService.serialize.mock.calls[0];
    expect(serializeCall[0][0]).toHaveProperty('daysUntilRenewal');
    expect(serializeCall[0][0]).toHaveProperty('urgency');
  });
});
```

- [ ] **Step 2: Run tests — confirm new tests fail**

```bash
npx jest --testPathPattern="contracts.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: FAIL

- [ ] **Step 3: Add imports and update contracts.service.ts**

Open `apps/api/src/modules/contracts/contracts.service.ts`. Add:

```typescript
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CsvService, ImportPreview } from '../import-export/csv.service';
```

Update constructor:

```typescript
constructor(
  private prisma: PrismaService,
  private auditLog: AuditLogService,
  private csvService: CsvService,
) {}
```

Add these methods after `remove`:

```typescript
async importPreview(csvString: string): Promise<ImportPreview> {
  const rows = this.csvService.parse(csvString);
  const validRows: Record<string, string>[] = [];
  const invalidRows: { rowNumber: number; data: Record<string, string>; errors: string[] }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const dto = plainToInstance(CreateContractDto, row, { enableImplicitConversion: true });
    const errors = await validate(dto);
    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: i + 1,
        data: row,
        errors: errors.flatMap((e) => Object.values(e.constraints ?? {})),
      });
    } else {
      validRows.push(row);
    }
  }

  return { totalRows: rows.length, validRows, invalidRows };
}

async importConfirm(
  rows: Record<string, string>[],
  actorId: string,
): Promise<{ imported: number }> {
  const dtos = rows.map((row) =>
    plainToInstance(CreateContractDto, row, { enableImplicitConversion: true }),
  );

  const created = await this.prisma.$transaction(
    dtos.map((dto) =>
      this.prisma.contract.create({
        data: {
          name: dto.name,
          contractType: dto.contractType as ContractType,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          noticePeriodDays: dto.noticePeriodDays,
          autoRenewal: dto.autoRenewal,
          annualCost: dto.annualCost,
          approvalStatus: dto.approvalStatus as ApprovalStatus,
          departmentId: dto.departmentId,
          notes: dto.notes,
        },
      }),
    ),
  );

  for (const contract of created) {
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Contract',
      entityId: contract.id,
    });
  }

  return { imported: created.length };
}

async exportCsv(): Promise<string> {
  const contracts = await this.findAll();
  const columns: (keyof (typeof contracts)[0])[] = [
    'id', 'name', 'contractType', 'vendorId', 'softwareProductId',
    'startDate', 'endDate', 'noticePeriodDays', 'autoRenewal',
    'annualCost', 'approvalStatus', 'notes',
    'cancellationDeadline', 'daysUntilRenewal', 'urgency',
    'createdAt', 'updatedAt',
  ];
  return this.csvService.serialize(contracts, columns);
}
```

- [ ] **Step 4: Update ContractsModule**

Replace `apps/api/src/modules/contracts/contracts.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ImportExportModule } from '../import-export/import-export.module';

@Module({
  imports: [AuditLogModule, ImportExportModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
```

- [ ] **Step 5: Add import/export endpoints to contracts.controller.ts**

Open `apps/api/src/modules/contracts/contracts.controller.ts`. Update imports:

```typescript
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
```

Add these endpoints **BEFORE `@Get(':id')` and `@Post()`**:

```typescript
@Post('import')
@Roles(Role.Admin, Role.Editor)
@UseInterceptors(FileInterceptor('file'))
async importPreview(@UploadedFile() file: Express.Multer.File) {
  const csvString = file.buffer.toString('utf-8');
  return this.service.importPreview(csvString);
}

@Post('import/confirm')
@Roles(Role.Admin, Role.Editor)
async importConfirm(
  @Body() body: { rows: Record<string, string>[] },
  @CurrentUser() user: AuthUser | undefined,
) {
  return this.service.importConfirm(body.rows, user!.id);
}

@Get('export')
@Roles(Role.Admin, Role.Editor)
async exportCsv(@Res() res: Response) {
  const csv = await this.service.exportCsv();
  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="contracts-${date}.csv"`);
  res.send(csv);
}
```

- [ ] **Step 6: Run all tests**

```bash
npx jest --testPathPattern="contracts.service.spec" --no-coverage 2>&1 | tail -5
```

Expected: all tests pass (original 20 + 6 new = 26 passing)

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/contracts/
git commit -m "feat: add contracts import/export with TDD (6 new tests)"
```

---

## Task 7: Full API Test Run

**Files:** None — verification only.

- [ ] **Step 1: Run the complete test suite**

```bash
cd apps/api
npx jest --no-coverage 2>&1 | tail -10
```

Expected output:
```
Test Suites: 9 passed, 9 total
Tests:       107 passed, 107 total
```

(89 original + 10 CsvService + 6 hardware import + 1 hardware export + 6 software + 6 contracts + 1 software export + 1 contract export ≈ ~107 — exact count may vary by a few depending on actual test counts)

- [ ] **Step 2: Fix any TypeScript errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Fix any errors before continuing.

- [ ] **Step 3: Commit if there were any fixes**

```bash
git add -A
git commit -m "fix: resolve any TypeScript issues after import/export additions" --allow-empty
```

---

## Task 8: CSV Template Files

**Files:**
- Create: `apps/web/public/templates/hardware-assets-template.csv`
- Create: `apps/web/public/templates/software-products-template.csv`
- Create: `apps/web/public/templates/contracts-template.csv`

- [ ] **Step 1: Create the templates directory**

```bash
mkdir -p apps/web/public/templates
```

- [ ] **Step 2: Create hardware-assets-template.csv**

Create `apps/web/public/templates/hardware-assets-template.csv`:

```
# assetType: laptop|desktop|server|vm|network_equipment|printer|mobile_device|storage|peripheral|other
# lifecycleStatus: planned|ordered|active|spare|in_repair|due_for_replacement|deferred|retired|disposed
# criticality: low|medium|high|mission_critical
# fundingType: opex|capex (optional)
# Dates must be YYYY-MM-DD format. Remove this comment row and the header comment rows before uploading.
assetTag,assetType,lifecycleStatus,criticality,manufacturer,model,serialNumber,purchaseDate,usefulLifeYears,purchaseCost,warrantyEndDate,supportEndDate,notes
HW-001,laptop,active,medium,Dell,Latitude 7420,SN12345,2022-01-15,4,1200.00,2025-01-15,,Example row — delete before upload
```

- [ ] **Step 3: Create software-products-template.csv**

Create `apps/web/public/templates/software-products-template.csv`:

```
# licenseModel: per_user|per_device|site_license|fte_based|concurrent_user|consumption_based|flat_annual|multi_year_agreement|other
# status: active|trial|under_review|renewal_pending|sunset_planned|replaced|terminated (optional)
# recommendedAction: keep|reduce|eliminate|renegotiate|consolidate|migrate (optional)
# licenseCount = number of licenses purchased. usersCount = actively used.
# Dates must be YYYY-MM-DD format.
name,licenseModel,licenseCount,usersCount,annualCost,renewalDate,status,notes
Microsoft 365,per_user,50,42,9000.00,2026-12-31,active,Example row — delete before upload
```

- [ ] **Step 4: Create contracts-template.csv**

Create `apps/web/public/templates/contracts-template.csv`:

```
# contractType: software_subscription|saas_agreement|enterprise_agreement|maintenance|support|hardware_lease|professional_services|other
# approvalStatus: not_reviewed|approved|flagged|cancelled (optional)
# autoRenewal: true|false (optional, default false)
# Dates must be YYYY-MM-DD format.
name,contractType,endDate,noticePeriodDays,autoRenewal,annualCost,approvalStatus,notes
Microsoft EA,enterprise_agreement,2026-12-31,60,false,9000.00,approved,Example row — delete before upload
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/public/templates/
git commit -m "feat: add CSV import templates for hardware-assets, software-products, contracts"
```

---

## Task 9: Frontend Server Actions

**Files:**
- Create: `apps/web/lib/actions/import-export.ts`

- [ ] **Step 1: Read reference file**

Read `apps/web/lib/api.ts` to understand the `apiServer` utility and how auth tokens are obtained.

- [ ] **Step 2: Create import-export.ts**

Create `apps/web/lib/actions/import-export.ts`:

```typescript
'use server';

import { auth } from '@/auth';

type ImportModule = 'hardware-assets' | 'software-products' | 'contracts';

export interface ImportPreviewResult {
  totalRows: number;
  validRows: Record<string, string>[];
  invalidRows: {
    rowNumber: number;
    data: Record<string, string>;
    errors: string[];
  }[];
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const session = await auth();
  const token = (session?.user as any)?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function importDryRun(
  formData: FormData,
): Promise<ImportPreviewResult> {
  const module = formData.get('module') as ImportModule;
  const file = formData.get('file') as File;

  const authHeader = await getAuthHeader();

  const apiFormData = new FormData();
  apiFormData.append('file', file);

  const res = await fetch(
    `${process.env.API_URL}/api/v1/${module}/import`,
    {
      method: 'POST',
      headers: authHeader,
      body: apiFormData,
      cache: 'no-store',
    },
  );

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function importConfirm(
  module: ImportModule,
  rows: Record<string, string>[],
): Promise<{ imported: number }> {
  const authHeader = await getAuthHeader();

  const res = await fetch(
    `${process.env.API_URL}/api/v1/${module}/import/confirm`,
    {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
      cache: 'no-store',
    },
  );

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function exportRecords(module: ImportModule): Promise<string> {
  const authHeader = await getAuthHeader();

  const res = await fetch(
    `${process.env.API_URL}/api/v1/${module}/export`,
    {
      headers: authHeader,
      cache: 'no-store',
    },
  );

  if (!res.ok) throw new Error(await res.text());
  return res.text();
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Fix any errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/actions/import-export.ts
git commit -m "feat: add import-export server actions (importDryRun, importConfirm, exportRecords)"
```

---

## Task 10: Rebuild /imports Frontend Page

**Files:**
- Rewrite: `apps/web/app/(protected)/imports/page.tsx`
- Create: `apps/web/app/(protected)/imports/client.tsx`

- [ ] **Step 1: Rewrite imports/page.tsx**

Replace the existing placeholder content of `apps/web/app/(protected)/imports/page.tsx`:

```typescript
import { ImportsClient } from './client';

export default function ImportsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Import Records</h1>
      </div>
      <ImportsClient />
    </div>
  );
}
```

- [ ] **Step 2: Create imports/client.tsx**

Create `apps/web/app/(protected)/imports/client.tsx`:

```typescript
'use client';

import { useState, useTransition } from 'react';
import {
  importDryRun,
  importConfirm,
  type ImportPreviewResult,
} from '@/lib/actions/import-export';

type ImportModule = 'hardware-assets' | 'software-products' | 'contracts';

const MODULES: { value: ImportModule; label: string; template: string }[] = [
  { value: 'hardware-assets', label: 'Hardware Assets', template: '/templates/hardware-assets-template.csv' },
  { value: 'software-products', label: 'Software Products', template: '/templates/software-products-template.csv' },
  { value: 'contracts', label: 'Contracts', template: '/templates/contracts-template.csv' },
];

export function ImportsClient() {
  const [selectedModule, setSelectedModule] = useState<ImportModule>('hardware-assets');
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const currentModule = MODULES.find((m) => m.value === selectedModule)!;

  function handleModuleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedModule(e.target.value as ImportModule);
    setPreview(null);
    setSuccessCount(null);
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(null);
    setSuccessCount(null);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('module', selectedModule);
        fd.append('file', file);
        const result = await importDryRun(fd);
        setPreview(result);
      } catch (err: any) {
        setError(err.message ?? 'Upload failed');
      }
    });
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  }

  function handleConfirm() {
    if (!preview || preview.validRows.length === 0) return;
    startTransition(async () => {
      try {
        const result = await importConfirm(selectedModule, preview.validRows);
        setSuccessCount(result.imported);
        setPreview(null);
      } catch (err: any) {
        setError(err.message ?? 'Import failed');
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Step 1: Module selector + template download */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select
              value={selectedModule}
              onChange={handleModuleChange}
              className="rounded-md border-gray-300 text-sm"
            >
              {MODULES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="pt-5">
            <a
              href={currentModule.template}
              download
              className="text-sm text-blue-600 hover:underline"
            >
              ↓ Download template CSV
            </a>
          </div>
        </div>
      </div>

      {/* Step 2: File upload */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Upload CSV file
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          {pending ? (
            <p className="text-sm text-gray-500">Validating…</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">Drop your CSV here, or</p>
              <label className="cursor-pointer inline-block px-4 py-2 bg-white border border-gray-300 text-sm rounded-md hover:bg-gray-50">
                Choose file
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">CSV files only</p>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success */}
      {successCount !== null && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          ✓ Successfully imported {successCount} record{successCount !== 1 ? 's' : ''}.
        </div>
      )}

      {/* Step 3: Dry-run preview */}
      {preview && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Preview — {preview.totalRows} row{preview.totalRows !== 1 ? 's' : ''}
              </span>
              {preview.validRows.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded">
                  {preview.validRows.length} valid
                </span>
              )}
              {preview.invalidRows.length > 0 && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded">
                  {preview.invalidRows.length} error{preview.invalidRows.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={pending || preview.validRows.length === 0}
              className="px-4 py-1.5 bg-slate-900 text-white text-sm rounded-md disabled:opacity-50 hover:bg-slate-700"
            >
              {pending ? 'Importing…' : `Import ${preview.validRows.length} record${preview.validRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">#</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Data</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.validRows.map((row, i) => (
                  <tr key={`v-${i}`} className="bg-green-50 border-b border-green-100">
                    <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-1.5 text-gray-700">
                      {Object.entries(row)
                        .filter(([, v]) => v)
                        .slice(0, 4)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </td>
                    <td className="px-3 py-1.5 text-green-700 font-medium">✓ Valid</td>
                  </tr>
                ))}
                {preview.invalidRows.map((row) => (
                  <tr key={`e-${row.rowNumber}`} className="bg-red-50 border-b border-red-100">
                    <td className="px-3 py-1.5 text-gray-500">{row.rowNumber}</td>
                    <td className="px-3 py-1.5 text-gray-700">
                      {Object.entries(row.data)
                        .filter(([, v]) => v)
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </td>
                    <td className="px-3 py-1.5 text-red-700">
                      ✗ {row.errors.join('; ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.invalidRows.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Error rows are skipped. Only valid rows will be imported.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Fix any errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(protected)/imports/
git commit -m "feat: rebuild /imports page with upload, dry-run preview, and confirm flow"
```

---

## Task 11: Download CSV Buttons + Final Check

**Files:**
- Modify: `apps/web/app/(protected)/hardware-assets/client.tsx`
- Modify: `apps/web/app/(protected)/software-products/client.tsx`
- Modify: `apps/web/app/(protected)/contracts/client.tsx`

**Pattern:** Add an `exporting` state boolean, an `handleExport` function that calls `exportRecords`, and a "Download CSV" button in the page header alongside the existing "Add" button.

- [ ] **Step 1: Add Download CSV to hardware-assets/client.tsx**

Open `apps/web/app/(protected)/hardware-assets/client.tsx`.

Add import at top:
```typescript
import { exportRecords } from '@/lib/actions/import-export';
```

Add state inside the component (after existing useState declarations):
```typescript
const [exporting, setExporting] = useState(false);
```

Add handler function inside the component (before the return):
```typescript
async function handleExport() {
  setExporting(true);
  try {
    const csv = await exportRecords('hardware-assets');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hardware-assets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } finally {
    setExporting(false);
  }
}
```

In the JSX, find the existing `<div className="flex justify-end">` button area and add the Download CSV button alongside the Add Asset button:

```tsx
<div className="flex justify-end gap-2">
  <button
    onClick={handleExport}
    disabled={exporting}
    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50"
  >
    {exporting ? 'Downloading…' : '↓ Download CSV'}
  </button>
  <button
    onClick={openCreate}
    className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-700"
  >
    Add Asset
  </button>
</div>
```

- [ ] **Step 2: Add Download CSV to software-products/client.tsx**

Make the same changes to `apps/web/app/(protected)/software-products/client.tsx`:

Add import:
```typescript
import { exportRecords } from '@/lib/actions/import-export';
```

Add state:
```typescript
const [exporting, setExporting] = useState(false);
```

Add handler:
```typescript
async function handleExport() {
  setExporting(true);
  try {
    const csv = await exportRecords('software-products');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `software-products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } finally {
    setExporting(false);
  }
}
```

Update the button area in JSX to include the Download CSV button alongside the existing Add button.

- [ ] **Step 3: Add Download CSV to contracts/client.tsx**

Make the same changes to `apps/web/app/(protected)/contracts/client.tsx`:

Add import:
```typescript
import { exportRecords } from '@/lib/actions/import-export';
```

Add state:
```typescript
const [exporting, setExporting] = useState(false);
```

Add handler:
```typescript
async function handleExport() {
  setExporting(true);
  try {
    const csv = await exportRecords('contracts');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } finally {
    setExporting(false);
  }
}
```

Update button area in JSX.

- [ ] **Step 4: Run full TypeScript check on web app**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Fix any errors before continuing.

- [ ] **Step 5: Run full API test suite one final time**

```bash
cd apps/api && npx jest --no-coverage 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/(protected)/hardware-assets/client.tsx \
        apps/web/app/(protected)/software-products/client.tsx \
        apps/web/app/(protected)/contracts/client.tsx
git commit -m "feat: add Download CSV buttons to hardware-assets, software-products, contracts list pages"
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: Phase 2b complete — CSV import/export for all three modules" --allow-empty
```
