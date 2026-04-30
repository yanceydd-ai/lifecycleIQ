import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async create(dto: CreateDepartmentDto, actorId: string) {
    const dept = await this.prisma.department.create({ data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Department',
      entityId: dept.id,
      newValue: { name: dept.name },
    });
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto, actorId: string) {
    const existing = await this.findOne(id);
    const dept = await this.prisma.department.update({ where: { id }, data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Department',
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: dept.name },
    });
    return dept;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.department.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Department',
      entityId: id,
    });
    return { deleted: true };
  }
}
