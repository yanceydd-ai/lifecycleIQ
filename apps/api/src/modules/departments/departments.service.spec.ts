import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const mockPrisma = {
  department: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};
const mockAuditLog = { log: jest.fn() };

const dept = {
  id: 'dept-1',
  name: 'IT',
  budgetCode: 'IT-001',
  ownerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<DepartmentsService>(DepartmentsService);
  });

  describe('findAll', () => {
    it('returns all departments', async () => {
      mockPrisma.department.findMany.mockResolvedValue([dept]);
      expect(await service.findAll()).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns department when found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(dept);
      const result = await service.findOne('dept-1');
      expect(result.name).toBe('IT');
    });
  });

  describe('create', () => {
    it('creates department and writes audit log', async () => {
      mockPrisma.department.create.mockResolvedValue(dept);
      await service.create({ name: 'IT' }, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'Department' }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'X' }, 'actor')).rejects.toThrow(NotFoundException);
    });

    it('updates and writes audit log', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(dept);
      mockPrisma.department.update.mockResolvedValue({ ...dept, name: 'IT Updated' });
      await service.update('dept-1', { name: 'IT Updated' }, 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', entityType: 'Department' }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor')).rejects.toThrow(NotFoundException);
    });

    it('deletes and writes audit log', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(dept);
      mockPrisma.department.delete.mockResolvedValue(dept);
      await service.remove('dept-1', 'actor-id');
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'Department', entityId: 'dept-1' }),
      );
    });
  });
});
