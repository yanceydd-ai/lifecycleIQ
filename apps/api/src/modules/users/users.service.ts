import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const safeSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({ select: safeSelect });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: safeSelect });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
        role: dto.role as any,
        departmentId: dto.departmentId,
      },
      select: safeSelect,
    });

    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      newValue: { email: user.email, role: user.role },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const existing = await this.findOne(id);
    const { password, ...rest } = dto;
    const data: any = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.update({ where: { id }, data, select: safeSelect });

    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      oldValue: { role: existing.role, isActive: existing.isActive },
      newValue: { role: user.role, isActive: user.isActive },
    });

    return user;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
    });
    return { deleted: true };
  }
}
