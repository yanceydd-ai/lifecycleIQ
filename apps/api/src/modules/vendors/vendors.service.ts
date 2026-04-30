import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.vendor.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async create(dto: CreateVendorDto, actorId: string) {
    const vendor = await this.prisma.vendor.create({ data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Vendor',
      entityId: vendor.id,
      newValue: { name: vendor.name },
    });
    return vendor;
  }

  async update(id: string, dto: UpdateVendorDto, actorId: string) {
    const existing = await this.findOne(id);
    const vendor = await this.prisma.vendor.update({ where: { id }, data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Vendor',
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: vendor.name },
    });
    return vendor;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.vendor.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Vendor',
      entityId: id,
    });
    return { deleted: true };
  }
}
