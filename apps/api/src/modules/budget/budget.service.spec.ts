import { Test, TestingModule } from '@nestjs/testing';
import { BudgetService, computeForecast } from './budget.service';
import { PrismaService } from '../../prisma/prisma.service';

function dec(n: number) { return { toNumber: () => n } as any; }

function mockAsset(overrides: any = {}) {
  return {
    id: 'hw-1', assetTag: 'HW-001', assetType: 'laptop',
    lifecycleStatus: 'active', criticality: 'medium',
    purchaseDate: new Date('2020-01-01'), usefulLifeYears: 4,
    purchaseCost: dec(1000), replacementCost: null,
    replacementYearOverride: null, annualMaintenanceCost: null,
    ...overrides,
  };
}

function mockSoftware(overrides: any = {}) {
  return { id: 'sw-1', name: 'Microsoft 365', status: 'active', annualCost: dec(9000), ...overrides };
}

function mockContract(overrides: any = {}) {
  return { id: 'ct-1', name: 'Microsoft EA', endDate: null, annualCost: dec(5000), ...overrides };
}

const BASE = { fiscalYearStartMonth: 1, defaultEscalationRate: 0.03 };
const TODAY = new Date('2026-05-06');

describe('computeForecast', () => {
  it('returns the requested number of years', () => {
    expect(computeForecast([], [], [], BASE, 7, TODAY)).toHaveLength(7);
  });

  it('starts from current fiscal year (Jan start, May 2026)', () => {
    const result = computeForecast([], [], [], BASE, 1, TODAY);
    expect(result[0].fiscalYear).toBe(2026);
  });

  it('correctly determines FY when today is before fiscal year start month', () => {
    // FY starts April; today Feb 2026 → current FY is 2025
    const result = computeForecast([], [], [], { fiscalYearStartMonth: 4, defaultEscalationRate: 0 }, 1, new Date('2026-02-01'));
    expect(result[0].fiscalYear).toBe(2025);
  });

  it('places hardware replacement CapEx only in the correct fiscal year', () => {
    const asset = mockAsset({ replacementYearOverride: 2028, purchaseCost: dec(5000) });
    const result = computeForecast([asset], [], [], { ...BASE, defaultEscalationRate: 0 }, 7, TODAY);
    expect(result.find(y => y.fiscalYear === 2028)!.breakdown.hardwareReplacement).toBe(5000);
    expect(result.find(y => y.fiscalYear === 2026)!.breakdown.hardwareReplacement).toBe(0);
  });

  it('excludes retired assets from hardware replacement', () => {
    const asset = mockAsset({ replacementYearOverride: 2026, lifecycleStatus: 'retired' });
    const result = computeForecast([asset], [], [], BASE, 1, TODAY);
    expect(result[0].breakdown.hardwareReplacement).toBe(0);
  });

  it('escalates hardware maintenance cost by offset year', () => {
    const asset = mockAsset({ annualMaintenanceCost: dec(1000) });
    const result = computeForecast([asset], [], [], { fiscalYearStartMonth: 1, defaultEscalationRate: 0.10 }, 3, TODAY);
    expect(result[0].breakdown.hardwareMaintenance).toBeCloseTo(1000, 1);
    expect(result[1].breakdown.hardwareMaintenance).toBeCloseTo(1100, 1);
    expect(result[2].breakdown.hardwareMaintenance).toBeCloseTo(1210, 1);
  });

  it('excludes terminated software from OpEx', () => {
    const sw = mockSoftware({ status: 'terminated' });
    const result = computeForecast([], [sw], [], BASE, 1, TODAY);
    expect(result[0].breakdown.software).toBe(0);
  });

  it('excludes contract whose endDate is before the fiscal year start', () => {
    const contract = mockContract({ endDate: new Date('2026-03-01') });
    const result = computeForecast([], [], [contract], BASE, 2, TODAY);
    expect(result[0].breakdown.contracts).toBeGreaterThan(0);
    expect(result[1].breakdown.contracts).toBe(0);
  });

  it('flags spike when year total exceeds rolling avg × 1.30', () => {
    const a1 = mockAsset({ id: 'hw-a', replacementYearOverride: 2026, purchaseCost: dec(1000), annualMaintenanceCost: null });
    const a2 = mockAsset({ id: 'hw-b', replacementYearOverride: 2027, purchaseCost: dec(2000), annualMaintenanceCost: null });
    const result = computeForecast([a1, a2], [], [], { fiscalYearStartMonth: 1, defaultEscalationRate: 0 }, 2, TODAY);
    expect(result[0].isSpike).toBe(false);
    expect(result[1].isSpike).toBe(true);
  });

  it('never flags the first year as a spike', () => {
    const asset = mockAsset({ replacementYearOverride: 2026, purchaseCost: dec(9999999) });
    const result = computeForecast([asset], [], [], BASE, 1, TODAY);
    expect(result[0].isSpike).toBe(false);
  });
});

const mockPrisma = {
  fiscalYearSettings: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  hardwareAsset: { findMany: jest.fn() },
  softwareProduct: { findMany: jest.fn() },
  contract: { findMany: jest.fn() },
};

const defaultSettingsRow = {
  id: 'fys-1', fiscalYearStartMonth: 1,
  defaultEscalationRate: { toNumber: () => 0.03 },
  createdAt: new Date(), updatedAt: new Date(),
};

describe('BudgetService', () => {
  let service: BudgetService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<BudgetService>(BudgetService);
  });

  describe('getSettings', () => {
    it('returns existing settings row', async () => {
      mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(defaultSettingsRow);
      const result = await service.getSettings();
      expect(result.fiscalYearStartMonth).toBe(1);
    });

    it('creates default settings when none exists', async () => {
      mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(null);
      mockPrisma.fiscalYearSettings.create.mockResolvedValue(defaultSettingsRow);
      await service.getSettings();
      expect(mockPrisma.fiscalYearSettings.create).toHaveBeenCalledWith({
        data: { fiscalYearStartMonth: 1, defaultEscalationRate: 0.03 },
      });
    });
  });

  describe('updateSettings', () => {
    it('updates the existing settings row', async () => {
      mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(defaultSettingsRow);
      const updated = { ...defaultSettingsRow, fiscalYearStartMonth: 4 };
      mockPrisma.fiscalYearSettings.update.mockResolvedValue(updated);
      const result = await service.updateSettings({ fiscalYearStartMonth: 4 });
      expect(result.fiscalYearStartMonth).toBe(4);
      expect(mockPrisma.fiscalYearSettings.update).toHaveBeenCalledWith({
        where: { id: 'fys-1' },
        data: { fiscalYearStartMonth: 4, defaultEscalationRate: undefined },
      });
    });
  });

  describe('getForecast', () => {
    it('returns ForecastYear array with requested length', async () => {
      mockPrisma.fiscalYearSettings.findFirst.mockResolvedValue(defaultSettingsRow);
      mockPrisma.hardwareAsset.findMany.mockResolvedValue([]);
      mockPrisma.softwareProduct.findMany.mockResolvedValue([]);
      mockPrisma.contract.findMany.mockResolvedValue([]);
      const result = await service.getForecast(5);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(5);
    });
  });
});
