import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SoftwareProductsService, computeUtilization } from './software-products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CsvService } from '../import-export/csv.service';

const mockPrisma = {
  softwareProduct: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};
const mockAuditLog = { log: jest.fn() };
const mockCsvService = { parse: jest.fn(), serialize: jest.fn() };

// Helper to create a duck-typed Prisma Decimal
function decimal(n: number) {
  return { toNumber: () => n };
}

const baseProduct = {
  id: 'sw-1',
  name: 'Acrobat Pro',
  vendorId: null,
  category: null,
  description: null,
  licenseModel: 'per_user',
  qtyPurchased: 100,
  qtyAssigned: null,
  qtyActivelyUsed: 75,
  unitCost: { toNumber: () => 15 } as any,
  annualCost: decimal(12000),
  billingFrequency: null,
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
  it('returns nulls when qtyPurchased is null', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: null } as any);
    expect(result.utilizationRate).toBeNull();
    expect(result.unusedLicenses).toBeNull();
    expect(result.potentialSavings).toBeNull();
    expect(result.lowUtilization).toBe(false);
  });

  it('returns nulls when qtyPurchased is zero', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 0 } as any);
    expect(result.utilizationRate).toBeNull();
    expect(result.unusedLicenses).toBeNull();
    expect(result.potentialSavings).toBeNull();
    expect(result.lowUtilization).toBe(false);
  });

  it('returns nulls when qtyActivelyUsed is null', () => {
    const result = computeUtilization({ ...baseProduct, qtyActivelyUsed: null } as any);
    expect(result.utilizationRate).toBeNull();
    expect(result.unusedLicenses).toBeNull();
    expect(result.potentialSavings).toBeNull();
    expect(result.lowUtilization).toBe(false);
  });

  it('computes utilizationRate as a decimal ratio rounded to 4dp', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 3, qtyActivelyUsed: 1, annualCost: null } as any);
    // 1/3 = 0.3333...
    expect(result.utilizationRate).toBe(0.3333);
  });

  it('computes unusedLicenses as qtyPurchased - qtyActivelyUsed', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 75, annualCost: null } as any);
    expect(result.unusedLicenses).toBe(25);
  });

  it('computes potentialSavings for per_user model using unitCost', () => {
    // licenseModel=per_user, unitCost=15, qtyPurchased=100, qtyActivelyUsed=80 => unused=20
    // savings = 20 * 15 = 300
    const result = computeUtilization({
      ...baseProduct,
      licenseModel: 'per_user',
      qtyPurchased: 100,
      qtyActivelyUsed: 80,
      unitCost: { toNumber: () => 15 } as any,
    } as any);
    expect(result.potentialSavings).toBe(300);
  });

  it('returns null potentialSavings for site_license model', () => {
    const result = computeUtilization({
      ...baseProduct,
      licenseModel: 'site_license',
      qtyPurchased: 100,
      qtyActivelyUsed: 80,
      unitCost: { toNumber: () => 15 } as any,
    } as any);
    expect(result.potentialSavings).toBeNull();
  });

  it('sets lowUtilization true when utilizationRate < 0.70', () => {
    // 60/100 = 0.6 < 0.70
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 60, annualCost: null } as any);
    expect(result.lowUtilization).toBe(true);
  });

  it('sets lowUtilization false when utilizationRate >= 0.70', () => {
    // 70/100 = 0.7 >= 0.70
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 70, annualCost: null } as any);
    expect(result.lowUtilization).toBe(false);
  });

  it('sets potentialSavings null when unitCost is null', () => {
    const result = computeUtilization({ ...baseProduct, qtyPurchased: 100, qtyActivelyUsed: 75, unitCost: null } as any);
    expect(result.potentialSavings).toBeNull();
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
        { provide: CsvService, useValue: mockCsvService },
      ],
    }).compile();
    service = module.get<SoftwareProductsService>(SoftwareProductsService);
  });

  describe('findAll', () => {
    it('returns all products with computed fields', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([baseProduct]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('utilizationRate');
      expect(result[0]).toHaveProperty('unusedLicenses');
      expect(result[0]).toHaveProperty('lowUtilization');
    });

    it('filters by status when provided', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([baseProduct]);
      await service.findAll({ status: 'active' as any });
      expect(mockPrisma.softwareProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'active' }) }),
      );
    });

    it('filters by departmentId when provided', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([baseProduct]);
      await service.findAll({ departmentId: 'dept-1' });
      expect(mockPrisma.softwareProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ departmentId: 'dept-1' }) }),
      );
    });
  });

  describe('findOne', () => {
    it('returns product with computed fields', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(baseProduct);
      const result = await service.findOne('sw-1');
      expect(result.id).toBe('sw-1');
      expect(result).toHaveProperty('utilizationRate');
    });

    it('throws NotFoundException when product not found', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates product and writes CREATE audit log', async () => {
      mockPrisma.softwareProduct.create.mockResolvedValue(baseProduct);
      await service.create({ name: 'Acrobat Pro', vendor: 'Adobe', licenseModel: 'per_user' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'SoftwareProduct' }),
      );
    });
  });

  describe('update', () => {
    it('updates product and writes UPDATE audit log', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(baseProduct);
      mockPrisma.softwareProduct.update.mockResolvedValue({ ...baseProduct, status: 'under_review' });
      await service.update('sw-1', { status: 'under_review' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'SoftwareProduct' }),
      );
    });

    it('throws NotFoundException when product not found', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {}, 'actor')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting status to terminated and writes DELETE audit log', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(baseProduct);
      mockPrisma.softwareProduct.update.mockResolvedValue({ ...baseProduct, status: 'terminated' });
      const result = await service.remove('sw-1', 'actor-id');
      expect(mockPrisma.softwareProduct.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'terminated' }) }),
      );
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'SoftwareProduct', entityId: 'sw-1' }),
      );
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFoundException when product not found', async () => {
      mockPrisma.softwareProduct.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
    });
  });

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
});
