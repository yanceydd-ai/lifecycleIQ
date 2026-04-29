import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockAuditLog = { log: jest.fn() };

const safeUser = {
  id: 'uuid-1',
  email: 'a@test.com',
  displayName: 'A',
  role: 'admin',
  departmentId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns array of users without passwordHash', async () => {
      mockPrisma.user.findMany.mockResolvedValue([safeUser]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('findOne', () => {
    it('returns user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(safeUser);
      const result = await service.findOne('uuid-1');
      expect(result.id).toBe('uuid-1');
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('hashes password and creates user with audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.create.mockResolvedValue(safeUser);

      await service.create(
        { email: 'a@test.com', password: 'password1', displayName: 'A', role: 'admin' as any },
        'actor-id',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('password1', 12);
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entityType: 'User' }),
      );
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(safeUser);
      await expect(
        service.create(
          { email: 'a@test.com', password: 'password1', displayName: 'A', role: 'admin' as any },
          'actor-id',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes user and logs audit entry', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(safeUser);
      mockPrisma.user.delete.mockResolvedValue(safeUser);

      await service.remove('uuid-1', 'actor-id');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE', entityType: 'User', entityId: 'uuid-1' }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing', 'actor-id')).rejects.toThrow(NotFoundException);
    });
  });
});
