import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HardwareAssetsService, computeHardwareFields } from './hardware-assets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CsvService } from '../import-export/csv.service';

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
const mockAuditLog = { log: jest.fn() };
const mockCsvService = { parse: jest.fn(), serialize: jest.fn() };

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
        { provide: CsvService, useValue: mockCsvService },
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
});
