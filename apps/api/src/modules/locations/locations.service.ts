import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.prisma.location.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const loc = await this.prisma.location.findUnique({ where: { id } });
    if (!loc) throw new NotFoundException(`Location ${id} not found`);
    return loc;
  }

  async create(dto: CreateLocationDto, actorId: string) {
    const loc = await this.prisma.location.create({ data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Location',
      entityId: loc.id,
      newValue: { name: loc.name },
    });
    return loc;
  }

  async update(id: string, dto: UpdateLocationDto, actorId: string) {
    const existing = await this.findOne(id);
    const loc = await this.prisma.location.update({ where: { id }, data: dto });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Location',
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: loc.name },
    });
    return loc;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.location.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Location',
      entityId: id,
    });
    return { deleted: true };
  }
}
