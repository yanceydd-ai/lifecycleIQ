import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  location: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockAuditLog = { log: jest.fn() };

const loc = {
  id: 'loc-1',
  name: 'Main Building',
  building: 'A',
  room: '101',
  locationType: 'office',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('LocationsService', () => {
  let service: LocationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<LocationsService>(LocationsService);
  });

  it('findAll returns all locations', async () => {
    mockPrisma.location.findMany.mockResolvedValue([loc]);
    expect(await service.findAll()).toHaveLength(1);
  });

  it('findOne throws NotFoundException when not found', async () => {
    mockPrisma.location.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('create writes audit log', async () => {
    mockPrisma.location.create.mockResolvedValue(loc);
    await service.create({ name: 'Main Building' }, 'actor-id');
    expect(mockAuditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityType: 'Location' }),
    );
  });

  it('update throws NotFoundException when not found', async () => {
    mockPrisma.location.findUnique.mockResolvedValue(null);
    await expect(service.update('missing', { name: 'X' }, 'actor')).rejects.toThrow(NotFoundException);
  });

  it('remove throws NotFoundException when not found', async () => {
    mockPrisma.location.findUnique.mockResolvedValue(null);
    await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
  });
});
