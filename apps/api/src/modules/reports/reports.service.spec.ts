import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';

function dec(n: number) { return { toNumber: () => n } as any; }

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

function mockAsset(overrides: any = {}) {
  return {
    id: 'hw-1', assetTag: 'HW-001', assetType: 'laptop',
    manufacturer: 'Dell', model: 'XPS 15',
    lifecycleStatus: 'active', criticality: 'medium',
    purchaseDate: new Date('2020-01-01'), usefulLifeYears: 4,
    purchaseCost: dec(2000), replacementCost: null,
    replacementYearOverride: null, annualMaintenanceCost: null,
    warrantyEndDate: null, supportEndDate: null,
    location: null, department: null,
    ...overrides,
  };
}

function mockSoftware(overrides: any = {}) {
  return {
    id: 'sw-1', name: 'Microsoft 365', status: 'active',
    annualCost: dec(9000), unitCost: dec(30),
    qtyPurchased: 100, qtyActivelyUsed: 60,
    renewalDate: null, noticePeriodDays: null,
    recommendedAction: null, riskIfNotRenewed: null,
    ...overrides,
  };
}

function mockContract(overrides: any = {}) {
  return {
    id: 'ct-1', name: 'Microsoft EA',
    renewalDate: null, noticePeriodDays: null,
    cancellationDeadlineOverride: null,
    annualCost: dec(5000), approvalStatus: 'not_reviewed',
    recommendedAction: null, autoRenewal: false,
    endDate: null,
    ...overrides,
  };
}

const mockFiscalSettings = {
  id: 'fys-1',
  fiscalYearStartMonth: 1,
  defaultEscalationRate: { toNumber: () => 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  fiscalYearSettings: { findFirst: jest.fn() },
  hardwareAsset: { findMany: jest.fn() },
  softwareProduct: { findMany: jest.fn() },
  contract: { findMany: jest.fn() },
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(mockFiscalSettings);
    mockPrisma.hardwareAsset.findMany.mockResolvedValue([]);
    mockPrisma.softwareProduct.findMany.mockResolvedValue([]);
    mockPrisma.contract.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ReportsService>(ReportsService);
  });

  describe('getExecutiveBudget', () => {
    it('returns currentYearOpex and currentYearCapex from forecast', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ replacementYearOverride: new Date().getFullYear(), purchaseCost: dec(3000) }),
      ]);
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.currentYearCapex).toBeGreaterThan(0);
      expect(result.currentYearOpex).toBeGreaterThan(0);
    });

    it('computes threeYearTotal as sum of first 3 forecast years', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ annualCost: dec(1000), qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.threeYearTotal).toBeCloseTo(3000, 0);
    });

    it('computes sevenYearTotal as sum of all 7 forecast years', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ annualCost: dec(1000), qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.sevenYearTotal).toBeCloseTo(7000, 0);
    });

    it('includes contracts with renewalDate within 120 days in topRenewals', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(30), annualCost: dec(5000) }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.topRenewals).toHaveLength(1);
      expect(result.topRenewals[0].name).toBe('Microsoft EA');
      expect(result.topRenewals[0].type).toBe('Contract');
    });

    it('excludes contracts with renewalDate beyond 120 days from topRenewals', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(200), annualCost: dec(5000) }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.topRenewals).toHaveLength(0);
    });

    it('sorts topRenewals by cost descending', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ id: 'c1', name: 'Cheap', renewalDate: daysFromNow(10), annualCost: dec(1000) }),
        mockContract({ id: 'c2', name: 'Expensive', renewalDate: daysFromNow(10), annualCost: dec(9000) }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.topRenewals[0].name).toBe('Expensive');
      expect(result.topRenewals[1].name).toBe('Cheap');
    });

    it('returns savingsOpportunities for software with utilization < 0.70', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 50, annualCost: dec(3000), unitCost: dec(30) }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.savingsOpportunities).toHaveLength(1);
      expect(result.savingsOpportunities[0].utilizationRate).toBeCloseTo(0.5);
      expect(result.savingsOpportunities[0].potentialSavings).toBeCloseTo(50 * 30);
    });

    it('excludes software with utilization >= 0.70 from savingsOpportunities', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 80 }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.savingsOpportunities).toHaveLength(0);
    });

    it('returns highPriorityRecommendations with score >= 70', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({
          criticality: 'mission_critical',
          supportEndDate: new Date('2020-01-01'),
          lifecycleStatus: 'due_for_replacement',
          replacementYearOverride: new Date().getFullYear(),
          purchaseCost: dec(50000),
        }),
      ]);
      const result = await service.getExecutiveBudget();
      expect(result.highPriorityRecommendations.length).toBeGreaterThan(0);
      expect(result.highPriorityRecommendations[0].score).toBeGreaterThanOrEqual(70);
    });
  });

  describe('getRenewalReview', () => {
    it('returns contracts with renewalDate within 120 days', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(45) }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.upcomingRenewals).toHaveLength(1);
      expect(result.upcomingRenewals[0].type).toBe('Contract');
    });

    it('returns software with renewalDate within 120 days', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ renewalDate: daysFromNow(60), qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.upcomingRenewals).toHaveLength(1);
      expect(result.upcomingRenewals[0].type).toBe('Software');
    });

    it('excludes contracts with renewalDate beyond 120 days', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(180) }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.upcomingRenewals).toHaveLength(0);
    });

    it('computes cancellation deadline from renewalDate minus noticePeriodDays', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(60), noticePeriodDays: 30 }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.cancellationDeadlines).toHaveLength(1);
    });

    it('uses cancellationDeadlineOverride when set', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(200), cancellationDeadlineOverride: daysFromNow(30) }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.cancellationDeadlines).toHaveLength(1);
    });

    it('excludes contracts whose cancellation deadline is beyond 120 days', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        mockContract({ renewalDate: daysFromNow(200), noticePeriodDays: 30 }),
      ]);
      const result = await service.getRenewalReview();
      expect(result.cancellationDeadlines).toHaveLength(0);
    });
  });

  describe('getCapitalReplacement', () => {
    it('groups assets by their replacement year', async () => {
      const thisYear = new Date().getFullYear();
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ replacementYearOverride: thisYear, purchaseCost: dec(1000) }),
      ]);
      const result = await service.getCapitalReplacement();
      const yearGroup = result.byYear.find(g => g.fiscalYear === thisYear);
      expect(yearGroup).toBeDefined();
      expect(yearGroup!.assets).toHaveLength(1);
    });

    it('excludes retired and disposed assets from byYear', async () => {
      const thisYear = new Date().getFullYear();
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ replacementYearOverride: thisYear, lifecycleStatus: 'retired' }),
        mockAsset({ id: 'hw-2', replacementYearOverride: thisYear, lifecycleStatus: 'disposed' }),
      ]);
      const result = await service.getCapitalReplacement();
      const yearGroup = result.byYear.find(g => g.fiscalYear === thisYear);
      expect(yearGroup).toBeUndefined();
    });

    it('returns riskItems for assets with expired supportEndDate', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ supportEndDate: new Date('2020-01-01') }),
      ]);
      const result = await service.getCapitalReplacement();
      expect(result.riskItems).toHaveLength(1);
      expect(result.riskItems[0].supportEndDate).toBeTruthy();
    });

    it('returns riskItems for assets with expired warrantyEndDate', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ warrantyEndDate: new Date('2020-01-01') }),
      ]);
      const result = await service.getCapitalReplacement();
      expect(result.riskItems).toHaveLength(1);
    });

    it('does not return riskItems for assets with future warranty/support dates', async () => {
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([
        mockAsset({ warrantyEndDate: daysFromNow(365), supportEndDate: daysFromNow(365) }),
      ]);
      const result = await service.getCapitalReplacement();
      expect(result.riskItems).toHaveLength(0);
    });
  });

  describe('getSoftwareOptimization', () => {
    it('returns software with utilization < 0.70', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 60 }),
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.lowUtilization).toHaveLength(1);
    });

    it('excludes software with utilization >= 0.70', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 75 }),
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.lowUtilization).toHaveLength(0);
    });

    it('excludes terminated software from lowUtilization', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 10, status: 'terminated' }),
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.lowUtilization).toHaveLength(0);
    });

    it('calculates potentialSavings as unusedLicenses x unitCost', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ qtyPurchased: 100, qtyActivelyUsed: 50, unitCost: dec(20) }),
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.lowUtilization[0].potentialSavings).toBeCloseTo(50 * 20);
    });

    it('returns termination candidates from computed recommendations', async () => {
      mockPrisma.softwareProduct.findMany.mockResolvedValue([
        mockSoftware({ status: 'terminated', qtyPurchased: null, qtyActivelyUsed: null }),
      ]);
      const result = await service.getSoftwareOptimization();
      expect(result.terminationCandidates).toHaveLength(1);
      expect(result.terminationCandidates[0].action).toBe('terminate');
    });
  });
});
