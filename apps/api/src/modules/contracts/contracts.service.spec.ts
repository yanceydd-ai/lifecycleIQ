import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContractsService, computeContractDeadlines } from './contracts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CsvService } from '../import-export/csv.service';

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
const mockAuditLog = { log: jest.fn() };
const mockCsvService = { parse: jest.fn(), serialize: jest.fn() };

const baseContract = {
  id: 'c-1',
  name: 'Microsoft EA',
  contractType: 'enterprise_agreement',
  vendorId: null,
  softwareProductId: null,
  hardwareAssetId: null,
  startDate: null,
  endDate: new Date('2026-12-31'),
  renewalDate: null,
  noticePeriodDays: 30,
  autoRenewal: false,
  annualCost: null,
  renewalCost: null,
  escalationPct: null,
  approvalStatus: 'approved',
  documentLink: null,
  departmentId: null,
  businessOwner: null,
  technicalOwner: null,
  budgetOwner: null,
  notes: null,
  cancellationDeadlineOverride: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('computeContractDeadlines', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-01'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns null computed fields when endDate is null', () => {
    const result = computeContractDeadlines({ ...baseContract, endDate: null } as any);
    expect(result.cancellationDeadline).toBeNull();
    expect(result.daysUntilRenewal).toBeNull();
    expect(result.urgency).toBeNull();
  });

  it('computes cancellationDeadline as endDate minus noticePeriodDays', () => {
    const result = computeContractDeadlines({
      ...baseContract,
      endDate: new Date('2025-12-31'),
      noticePeriodDays: 30,
    } as any);
    // endDate 2025-12-31 minus 30 days = 2025-12-01
    expect(result.cancellationDeadline).toEqual(new Date('2025-12-01'));
  });

  it('returns cancellationDeadline null when noticePeriodDays is null', () => {
    const result = computeContractDeadlines({
      ...baseContract,
      endDate: new Date('2026-12-31'),
      noticePeriodDays: null,
    } as any);
    expect(result.cancellationDeadline).toBeNull();
    expect(result.daysUntilRenewal).toBeNull();
    expect(result.urgency).toBeNull();
  });

  it('computes daysUntilRenewal as differenceInDays(cancellationDeadline, today)', () => {
    // endDate = 2026-05-21, noticePeriodDays = 0, today = 2026-05-01
    // cancellationDeadline = 2026-05-21, daysUntilRenewal = 20
    const result = computeContractDeadlines({
      ...baseContract,
      endDate: new Date('2026-05-21'),
      noticePeriodDays: 0,
    } as any);
    expect(result.daysUntilRenewal).toBe(20);
  });

  it('sets urgency "red" when daysUntilRenewal <= 30', () => {
    // endDate 20 days from 2026-05-01 = 2026-05-21, noticePeriodDays=0
    const result = computeContractDeadlines({
      ...baseContract,
      endDate: new Date('2026-05-21'),
      noticePeriodDays: 0,
    } as any);
    expect(result.urgency).toBe('red');
  });

  it('sets urgency "amber" when daysUntilRenewal > 30 and <= 90', () => {
    // endDate 60 days from 2026-05-01 = 2026-06-30, noticePeriodDays=0
    const result = computeContractDeadlines({
      ...baseContract,
      endDate: new Date('2026-06-30'),
      noticePeriodDays: 0,
    } as any);
    expect(result.urgency).toBe('amber');
  });

  it('sets urgency "green" when daysUntilRenewal > 90', () => {
    // endDate 200 days from 2026-05-01 = 2026-11-17, noticePeriodDays=0
    const result = computeContractDeadlines({
      ...baseContract,
      endDate: new Date('2026-11-17'),
      noticePeriodDays: 0,
    } as any);
    expect(result.urgency).toBe('green');
  });

  it('returns urgency null when cancellationDeadline is null (noticePeriodDays null)', () => {
    const result = computeContractDeadlines({
      ...baseContract,
      endDate: new Date('2026-12-31'),
      noticePeriodDays: null,
    } as any);
    expect(result.urgency).toBeNull();
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
        { provide: CsvService, useValue: mockCsvService },
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
      expect(result[0]).toHaveProperty('daysUntilRenewal');
      expect(result[0]).toHaveProperty('urgency');
    });

    it('filters by contractType when provided', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([baseContract]);
      await service.findAll({ contractType: 'software_subscription' as any });
      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ contractType: 'software_subscription' }),
        }),
      );
    });

    it('filters by departmentId when provided', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([baseContract]);
      await service.findAll({ departmentId: 'dept-1' });
      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ departmentId: 'dept-1' }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns contract with computed fields', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(baseContract);
      const result = await service.findOne('c-1');
      expect(result.id).toBe('c-1');
      expect(result).toHaveProperty('cancellationDeadline');
      expect(result).toHaveProperty('urgency');
    });

    it('throws NotFoundException when contract not found', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates contract and writes CREATE audit log', async () => {
      mockPrisma.contract.create.mockResolvedValue(baseContract);
      await service.create({ name: 'Microsoft EA' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'Contract' }),
      );
    });

    it('throws BadRequestException when both vendorId and softwareProductId are provided', async () => {
      await expect(
        service.create(
          { name: 'Test', vendorId: 'v-1', softwareProductId: 'sp-1' } as any,
          'actor-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates contract and writes UPDATE audit log', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(baseContract);
      mockPrisma.contract.update.mockResolvedValue({ ...baseContract, name: 'Updated Name' });
      await service.update('c-1', { name: 'Updated Name' } as any, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'Contract' }),
      );
    });

    it('throws NotFoundException when contract not found', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', {}, 'actor')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when update would result in both vendorId and softwareProductId set', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue({ ...baseContract, vendorId: 'v-1' });
      await expect(
        service.update('c-1', { softwareProductId: 'sp-1' } as any, 'actor-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('hard-deletes contract and writes DELETE audit log', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(baseContract);
      mockPrisma.contract.delete.mockResolvedValue(baseContract);
      const result = await service.remove('c-1', 'actor-id');
      expect(mockPrisma.contract.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c-1' } }),
      );
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'Contract', entityId: 'c-1' }),
      );
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFoundException when contract not found', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
    });
  });

  describe('importPreview', () => {
    beforeEach(() => {
      mockCsvService.parse.mockReturnValue([
        { name: 'Microsoft EA', contractType: 'software_subscription', endDate: '2026-12-31', noticePeriodDays: '60', autoRenewal: 'false' },
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
        { name: '', contractType: 'software_subscription' },
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
        { name: 'Contract B', contractType: 'maintenance_agreement', autoRenewal: 'true' },
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
});
