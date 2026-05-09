import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService, computeRecommendation } from './recommendations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const TODAY = new Date('2026-05-08');
const CURRENT_YEAR = 2026;

function dec(n: number) { return { toNumber: () => n } as any; }

function mockHardware(overrides: any = {}): any {
  return {
    id: 'hw-1', assetTag: 'HW-001', manufacturer: 'Dell', model: 'XPS 15',
    assetType: 'laptop', lifecycleStatus: 'active', criticality: 'medium',
    purchaseDate: new Date('2021-01-01'), usefulLifeYears: 5,
    purchaseCost: dec(5000), replacementCost: null, replacementYearOverride: null,
    replacementYear: CURRENT_YEAR + 3,
    warrantyExpired: false, unsupported: false, highRisk: false,
    warrantyEndDate: null, supportEndDate: null,
    annualMaintenanceCost: null, recommendedAction: null,
    fundingType: 'capex', locationId: null, departmentId: null, vendorId: null,
    assignedUserId: null, businessOwner: null, technicalOwner: null, notes: null,
    serialNumber: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

function mockSoftware(overrides: any = {}): any {
  return {
    id: 'sw-1', name: 'Microsoft 365', status: 'active',
    renewalDate: null, noticePeriodDays: null, autoRenewal: false, recommendedAction: null,
    qtyPurchased: null, qtyActivelyUsed: null, annualCost: dec(5000),
    riskIfNotRenewed: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

function mockContract(overrides: any = {}): any {
  return {
    id: 'ct-1', name: 'Dell Support',
    renewalDate: null, endDate: null, autoRenewal: false, recommendedAction: null,
    approvalStatus: 'approved', annualCost: dec(5000),
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe('computeRecommendation — hardware', () => {
  it('returns maximum score=100 for mission_critical + past replacement + unsupported + due_for_replacement + high cost', () => {
    const asset = mockHardware({
      criticality: 'mission_critical',
      replacementYear: CURRENT_YEAR - 1,
      supportEndDate: new Date('2025-01-01'),
      lifecycleStatus: 'due_for_replacement',
      replacementCost: dec(15000),
    });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.score).toBe(100);
    expect(result.recommendedAction).toBe('replace');
  });

  it('recommendedAction=replace when replacementYear <= currentYear', () => {
    const asset = mockHardware({ replacementYear: CURRENT_YEAR });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.recommendedAction).toBe('replace');
  });

  it('recommendedAction=replace when lifecycleStatus=due_for_replacement', () => {
    const asset = mockHardware({ lifecycleStatus: 'due_for_replacement' });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.recommendedAction).toBe('replace');
  });

  it('recommendedAction=monitor when replacement far out with no risk factors', () => {
    const asset = mockHardware({ replacementYear: CURRENT_YEAR + 4, criticality: 'low' });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.recommendedAction).toBe('monitor');
  });

  it('security_risk score is higher when supportEndDate is in the past', () => {
    const assetWithExpiredSupport = mockHardware({ supportEndDate: new Date('2025-01-01'), criticality: 'mission_critical', replacementYear: CURRENT_YEAR - 1, lifecycleStatus: 'due_for_replacement', replacementCost: dec(15000) });
    const assetWithoutExpiredSupport = mockHardware({ criticality: 'mission_critical', replacementYear: CURRENT_YEAR - 1, lifecycleStatus: 'due_for_replacement', replacementCost: dec(15000) });
    expect(computeRecommendation('hardware_asset', assetWithExpiredSupport, TODAY).score)
      .toBeGreaterThan(computeRecommendation('hardware_asset', assetWithoutExpiredSupport, TODAY).score);
  });

  it('generates non-empty explanation string', () => {
    const asset = mockHardware();
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.explanation.length).toBeGreaterThan(10);
  });
});

describe('computeRecommendation — software', () => {
  it('lifecycle_risk is higher when renewalDate is imminent', () => {
    const imminent = mockSoftware({ renewalDate: new Date(TODAY.getTime() + 25 * 86400000) });
    const far = mockSoftware({ renewalDate: new Date(TODAY.getTime() + 200 * 86400000) });
    expect(computeRecommendation('software_product', imminent, TODAY).score)
      .toBeGreaterThan(computeRecommendation('software_product', far, TODAY).score);
  });

  it('lower utilization produces lower user_impact score', () => {
    const lowUtil = mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 40 });
    const highUtil = mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 80 });
    expect(computeRecommendation('software_product', lowUtil, TODAY).score)
      .toBeLessThan(computeRecommendation('software_product', highUtil, TODAY).score);
  });

  it('recommendedAction=renew_with_reduction when renewal_pending and utilization < 0.70', () => {
    const sw = mockSoftware({ status: 'renewal_pending', qtyPurchased: 100, qtyActivelyUsed: 60 });
    expect(computeRecommendation('software_product', sw, TODAY).recommendedAction).toBe('renew_with_reduction');
  });

  it('recommendedAction=renew_as_is when renewal_pending and utilization >= 0.70', () => {
    const sw = mockSoftware({ status: 'renewal_pending', qtyPurchased: 100, qtyActivelyUsed: 75 });
    expect(computeRecommendation('software_product', sw, TODAY).recommendedAction).toBe('renew_as_is');
  });

  it('recommendedAction=replace when status=sunset_planned', () => {
    const sw = mockSoftware({ status: 'sunset_planned' });
    expect(computeRecommendation('software_product', sw, TODAY).recommendedAction).toBe('replace');
  });

  it('recommendedAction=terminate when status=terminated', () => {
    const sw = mockSoftware({ status: 'terminated' });
    expect(computeRecommendation('software_product', sw, TODAY).recommendedAction).toBe('terminate');
  });
});

describe('computeRecommendation — contract', () => {
  it('security_risk score is higher when approvalStatus=review_required', () => {
    const needsReview = mockContract({ approvalStatus: 'review_required' });
    const approved = mockContract({ approvalStatus: 'approved' });
    expect(computeRecommendation('contract', needsReview, TODAY).score)
      .toBeGreaterThan(computeRecommendation('contract', approved, TODAY).score);
  });

  it('recommendedAction=renegotiate when renewalDate within 30 days and annualCost > $10k', () => {
    const soon = new Date(TODAY.getTime() + 25 * 86400000);
    const contract = mockContract({ renewalDate: soon, annualCost: dec(50000) });
    expect(computeRecommendation('contract', contract, TODAY).recommendedAction).toBe('renegotiate');
  });

  it('recommendedAction=renew_as_is when renewalDate within 90 days and low cost', () => {
    const soon = new Date(TODAY.getTime() + 80 * 86400000);
    const contract = mockContract({ renewalDate: soon, annualCost: dec(2000) });
    expect(computeRecommendation('contract', contract, TODAY).recommendedAction).toBe('renew_as_is');
  });

  it('recommendedAction=monitor when no renewal pressure', () => {
    const contract = mockContract({ renewalDate: null, annualCost: dec(2000) });
    expect(computeRecommendation('contract', contract, TODAY).recommendedAction).toBe('monitor');
  });
});

describe('score classification', () => {
  it('score >= 85 classifies as Must fund', () => {
    const asset = mockHardware({
      criticality: 'mission_critical', replacementYear: CURRENT_YEAR - 1,
      supportEndDate: new Date('2025-01-01'), lifecycleStatus: 'due_for_replacement',
      replacementCost: dec(15000),
    });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.classification).toBe('Must fund');
  });

  it('score 30-49 classifies as Optional or defer', () => {
    const asset = mockHardware({
      criticality: 'medium', replacementYear: CURRENT_YEAR + 5,
      warrantyEndDate: new Date('2025-01-01'),
      purchaseCost: dec(2000),
    });
    const result = computeRecommendation('hardware_asset', asset, TODAY);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThan(50);
    expect(result.classification).toBe('Optional or defer');
  });
});

// --- Service method tests ---

const mockPrisma = {
  hardwareAsset: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  softwareProduct: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  contract: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  decisionHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockAuditLog = { log: jest.fn() };

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<RecommendationsService>(RecommendationsService);
  });

  describe('override', () => {
    it('creates DecisionHistory row with correct previousAction for hardware', async () => {
      const existing = mockHardware({ id: 'hw-1', recommendedAction: 'monitor' });
      mockPrisma.hardwareAsset.findUniqueOrThrow.mockResolvedValue(existing);
      mockPrisma.hardwareAsset.update.mockResolvedValue({ ...existing, recommendedAction: 'replace' });
      mockPrisma.decisionHistory.create.mockResolvedValue({
        id: 'dh-1', entityType: 'hardware_asset', entityId: 'hw-1',
        previousAction: 'monitor', newAction: 'replace', rationale: 'Urgent replacement needed',
        userId: 'user-1', createdAt: new Date(),
      });

      await service.override('hardware_asset', 'hw-1', { newAction: 'replace', rationale: 'Urgent replacement needed' }, 'user-1');

      expect(mockPrisma.decisionHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'hardware_asset',
          entityId: 'hw-1',
          previousAction: 'monitor',
          newAction: 'replace',
          rationale: 'Urgent replacement needed',
          userId: 'user-1',
        }),
      });
    });

    it('updates recommendedAction on the hardware entity', async () => {
      const existing = mockHardware({ id: 'hw-1', recommendedAction: null });
      mockPrisma.hardwareAsset.findUniqueOrThrow.mockResolvedValue(existing);
      mockPrisma.hardwareAsset.update.mockResolvedValue({ ...existing, recommendedAction: 'defer' });
      mockPrisma.decisionHistory.create.mockResolvedValue({ id: 'dh-1' });

      await service.override('hardware_asset', 'hw-1', { newAction: 'defer', rationale: 'Budget constraints this year' }, 'user-1');

      expect(mockPrisma.hardwareAsset.update).toHaveBeenCalledWith({
        where: { id: 'hw-1' },
        data: { recommendedAction: 'defer' },
      });
    });

    it('creates AuditLog entry on override', async () => {
      const existing = mockHardware({ id: 'hw-1', recommendedAction: 'monitor' });
      mockPrisma.hardwareAsset.findUniqueOrThrow.mockResolvedValue(existing);
      mockPrisma.hardwareAsset.update.mockResolvedValue(existing);
      mockPrisma.decisionHistory.create.mockResolvedValue({ id: 'dh-1' });

      await service.override('hardware_asset', 'hw-1', { newAction: 'replace', rationale: 'End of support reached' }, 'user-1');

      expect(mockAuditLog.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'OVERRIDE',
        entityType: 'hardware_asset',
        entityId: 'hw-1',
      }));
    });
  });

  describe('getDecisionHistory', () => {
    it('returns rows sorted by createdAt desc', async () => {
      const rows = [
        { id: 'dh-2', createdAt: new Date('2026-05-08') },
        { id: 'dh-1', createdAt: new Date('2026-05-01') },
      ];
      mockPrisma.decisionHistory.findMany.mockResolvedValue(rows);

      const result = await service.getDecisionHistory('hardware_asset', 'hw-1');

      expect(mockPrisma.decisionHistory.findMany).toHaveBeenCalledWith({
        where: { entityType: 'hardware_asset', entityId: 'hw-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result[0].id).toBe('dh-2');
    });
  });
});
