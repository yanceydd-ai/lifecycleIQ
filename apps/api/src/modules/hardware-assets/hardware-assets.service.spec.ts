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
