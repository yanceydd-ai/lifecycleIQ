import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  vendor: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockAuditLog = { log: jest.fn() };

const vendor = {
  id: 'vendor-1',
  name: 'Microsoft',
  website: 'https://microsoft.com',
  accountRepName: null,
  accountRepEmail: null,
  supportEmail: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('VendorsService', () => {
  let service: VendorsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<VendorsService>(VendorsService);
  });

  it('findAll returns all vendors', async () => {
    mockPrisma.vendor.findMany.mockResolvedValue([vendor]);
    expect(await service.findAll()).toHaveLength(1);
  });

  it('findOne throws NotFoundException when not found', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('create writes audit log', async () => {
    mockPrisma.vendor.create.mockResolvedValue(vendor);
    await service.create({ name: 'Microsoft' }, 'actor-id');
    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityType: 'Vendor' }),
    );
  });

  it('update throws NotFoundException when not found', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue(null);
    await expect(service.update('missing', { name: 'X' }, 'actor')).rejects.toThrow(NotFoundException);
  });

  it('remove throws NotFoundException when not found', async () => {
    mockPrisma.vendor.findUnique.mockResolvedValue(null);
    await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
  });
});
