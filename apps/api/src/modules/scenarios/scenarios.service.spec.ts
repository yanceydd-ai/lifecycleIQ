import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ScenariosService, computeScenarioForecast } from './scenarios.service';
import { computeForecast } from '../budget/budget.service';
import { PrismaService } from '../../prisma/prisma.service';

const TODAY = new Date('2026-05-10');
const SETTINGS = { fiscalYearStartMonth: 1, defaultEscalationRate: 0.03, budgetSpikeThreshold: 0.30 };

function dec(n: number) { return { toNumber: () => n } as any; }

function mockAsset(overrides: any = {}): any {
  return {
    id: 'hw-1', assetTag: 'HW-001', manufacturer: 'Dell', model: 'XPS',
    assetType: 'laptop', lifecycleStatus: 'active', criticality: 'medium',
    purchaseDate: null, usefulLifeYears: null,
    purchaseCost: dec(5000), replacementCost: null,
    replacementYearOverride: 2027,
    warrantyEndDate: null, supportEndDate: null,
    annualMaintenanceCost: null, recommendedAction: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

function mockSoftware(overrides: any = {}): any {
  return {
    id: 'sw-1', name: 'Microsoft 365', status: 'active',
    annualCost: dec(9000), renewalDate: null, recommendedAction: null,
    ...overrides,
  };
}

function mockContract(overrides: any = {}): any {
  return {
    id: 'ct-1', name: 'Dell Support',
    endDate: null, annualCost: dec(5000), recommendedAction: null,
    ...overrides,
  };
}

function ov(entityType: string, entityId: string, overrideType: string, value: string) {
  return { entityType, entityId, overrideType, value };
}

describe('computeScenarioForecast', () => {
  it('returns same result as computeForecast when no overrides and same rate', () => {
    const asset = mockAsset({ replacementYearOverride: 2027, purchaseCost: dec(5000) });
    const sw = mockSoftware({ annualCost: dec(9000) });
    const baseline = computeForecast([asset], [sw], [], SETTINGS, 7, TODAY);
    const scenario = computeScenarioForecast([asset], [sw], [], SETTINGS, [], 0.03, 7, TODAY);
    expect(scenario).toEqual(baseline);
  });

  it('defer_year override changes hardware replacement year', () => {
    const asset = mockAsset({ id: 'hw-1', replacementYearOverride: 2026, purchaseCost: dec(5000) });
    const result = computeScenarioForecast(
      [asset], [], [], SETTINGS,
      [ov('hardware_asset', 'hw-1', 'defer_year', '2028')],
      0.03, 7, TODAY,
    );
    expect(result.find(y => y.fiscalYear === 2026)!.breakdown.hardwareReplacement).toBe(0);
    expect(result.find(y => y.fiscalYear === 2028)!.breakdown.hardwareReplacement).toBe(5000);
  });

  it('cost override changes hardware replacement cost', () => {
    const asset = mockAsset({ id: 'hw-1', replacementYearOverride: 2026, purchaseCost: dec(5000) });
    const result = computeScenarioForecast(
      [asset], [], [], SETTINGS,
      [ov('hardware_asset', 'hw-1', 'cost', '8000')],
      0.03, 7, TODAY,
    );
    expect(result.find(y => y.fiscalYear === 2026)!.breakdown.hardwareReplacement).toBe(8000);
  });

  it('cost override changes software annual cost', () => {
    const sw = mockSoftware({ id: 'sw-1', annualCost: dec(9000), status: 'active' });
    const withOverride = computeScenarioForecast(
      [], [sw], [], { ...SETTINGS, defaultEscalationRate: 0 },
      [ov('software_product', 'sw-1', 'cost', '5000')],
      0.0, 1, TODAY,
    );
    expect(withOverride[0].breakdown.software).toBe(5000);
  });

  it('cost override changes contract annual cost', () => {
    const ct = mockContract({ id: 'ct-1', annualCost: dec(12000), endDate: null });
    const withOverride = computeScenarioForecast(
      [], [], [ct], { ...SETTINGS, defaultEscalationRate: 0 },
      [ov('contract', 'ct-1', 'cost', '8000')],
      0.0, 1, TODAY,
    );
    expect(withOverride[0].breakdown.contracts).toBe(8000);
  });

  it('exclude override removes hardware asset from all forecast years', () => {
    const asset = mockAsset({ id: 'hw-1', replacementYearOverride: 2026, purchaseCost: dec(5000) });
    const result = computeScenarioForecast(
      [asset], [], [], SETTINGS,
      [ov('hardware_asset', 'hw-1', 'exclude', 'true')],
      0.03, 7, TODAY,
    );
    expect(result.every(y => y.breakdown.hardwareReplacement === 0)).toBe(true);
  });

  it('exclude override removes software product from OpEx', () => {
    const sw = mockSoftware({ id: 'sw-1', annualCost: dec(9000), status: 'active' });
    const result = computeScenarioForecast(
      [], [sw], [], { ...SETTINGS, defaultEscalationRate: 0 },
      [ov('software_product', 'sw-1', 'exclude', 'true')],
      0.0, 1, TODAY,
    );
    expect(result[0].breakdown.software).toBe(0);
  });

  it('exclude override removes contract from OpEx', () => {
    const ct = mockContract({ id: 'ct-1', annualCost: dec(5000), endDate: null });
    const result = computeScenarioForecast(
      [], [], [ct], { ...SETTINGS, defaultEscalationRate: 0 },
      [ov('contract', 'ct-1', 'exclude', 'true')],
      0.0, 1, TODAY,
    );
    expect(result[0].breakdown.contracts).toBe(0);
  });

  it('scenarioEscalationRate overrides settings defaultEscalationRate', () => {
    const sw = mockSoftware({ id: 'sw-1', annualCost: dec(10000), status: 'active' });
    const withZero = computeScenarioForecast([], [sw], [], SETTINGS, [], 0.0, 2, TODAY);
    const withTen = computeScenarioForecast([], [sw], [], SETTINGS, [], 0.10, 2, TODAY);
    expect(withZero[1].breakdown.software).toBeCloseTo(10000, 0);
    expect(withTen[1].breakdown.software).toBeCloseTo(11000, 0);
  });

  it('applies multiple overrides on the same entity', () => {
    const asset = mockAsset({ id: 'hw-1', replacementYearOverride: 2026, purchaseCost: dec(5000) });
    const result = computeScenarioForecast(
      [asset], [], [], SETTINGS,
      [
        ov('hardware_asset', 'hw-1', 'defer_year', '2028'),
        ov('hardware_asset', 'hw-1', 'cost', '8000'),
      ],
      0.03, 7, TODAY,
    );
    expect(result.find(y => y.fiscalYear === 2026)!.breakdown.hardwareReplacement).toBe(0);
    expect(result.find(y => y.fiscalYear === 2028)!.breakdown.hardwareReplacement).toBe(8000);
  });

  it('does not mutate original entity arrays', () => {
    const asset = mockAsset({ id: 'hw-1', replacementYearOverride: 2026 });
    const originalAssets = [asset];
    computeScenarioForecast(
      originalAssets, [], [], SETTINGS,
      [ov('hardware_asset', 'hw-1', 'defer_year', '2030')],
      0.03, 7, TODAY,
    );
    expect(originalAssets[0].replacementYearOverride).toBe(2026);
  });
});

// --- Service method tests ---

const mockPrisma = {
  scenario: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  scenarioOverride: {
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  fiscalYearSettings: { findFirst: jest.fn() },
  hardwareAsset: { findMany: jest.fn() },
  softwareProduct: { findMany: jest.fn() },
  contract: { findMany: jest.fn() },
};

describe('ScenariosService', () => {
  let service: ScenariosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScenariosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ScenariosService>(ScenariosService);
  });

  describe('remove', () => {
    it('deletes a custom scenario', async () => {
      mockPrisma.scenario.findUniqueOrThrow.mockResolvedValue({ id: 'sc-1', isSystem: false });
      mockPrisma.scenario.delete.mockResolvedValue({});
      await service.remove('sc-1');
      expect(mockPrisma.scenario.delete).toHaveBeenCalledWith({ where: { id: 'sc-1' } });
    });

    it('throws BadRequestException when isSystem=true', async () => {
      mockPrisma.scenario.findUniqueOrThrow.mockResolvedValue({ id: 'sc-1', isSystem: true });
      await expect(service.remove('sc-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.scenario.delete).not.toHaveBeenCalled();
    });
  });

  describe('upsertOverride', () => {
    it('upserts an override using the compound unique key', async () => {
      mockPrisma.scenario.findUniqueOrThrow.mockResolvedValue({ id: 'sc-1' });
      const fakeOverride = {
        id: 'ov-1', scenarioId: 'sc-1',
        entityType: 'hardware_asset', entityId: 'hw-1',
        overrideType: 'defer_year', value: '2029',
        createdAt: new Date(),
      };
      mockPrisma.scenarioOverride.upsert.mockResolvedValue(fakeOverride);

      const result = await service.upsertOverride('sc-1', {
        entityType: 'hardware_asset',
        entityId: 'hw-1',
        overrideType: 'defer_year',
        value: '2029',
      });

      expect(mockPrisma.scenarioOverride.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            scenarioId_entityType_entityId_overrideType: {
              scenarioId: 'sc-1',
              entityType: 'hardware_asset',
              entityId: 'hw-1',
              overrideType: 'defer_year',
            },
          },
          create: expect.objectContaining({ value: '2029' }),
          update: { value: '2029' },
        }),
      );
      expect(result.value).toBe('2029');
    });
  });

  describe('removeOverride', () => {
    it('deletes an override by id', async () => {
      mockPrisma.scenarioOverride.delete.mockResolvedValue({});
      await service.removeOverride('sc-1', 'ov-1');
      expect(mockPrisma.scenarioOverride.delete).toHaveBeenCalledWith({ where: { id: 'ov-1', scenarioId: 'sc-1' } });
    });
  });

  describe('create', () => {
    it('creates a custom scenario with type custom and isSystem false', async () => {
      const fakeScenario = {
        id: 'sc-new', name: 'My Plan', type: 'custom',
        escalationRate: { toNumber: () => 0.03 }, isSystem: false,
        isRecommended: false, createdBy: 'user-1',
        overrides: [], createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma.scenario.create.mockResolvedValue(fakeScenario);
      const result = await service.create({ name: 'My Plan', escalationRate: 0.03 }, 'user-1');
      expect(mockPrisma.scenario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'My Plan', type: 'custom', isSystem: false }),
        }),
      );
      expect(result.name).toBe('My Plan');
    });
  });
});
