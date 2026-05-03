import { Injectable, NotFoundException } from '@nestjs/common';
import { SoftwareProduct, SoftwareStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateSoftwareProductDto } from './dto/create-software-product.dto';
import { UpdateSoftwareProductDto } from './dto/update-software-product.dto';

export type SoftwareProductWithComputed = SoftwareProduct & {
  utilizationRate: number | null;
  unusedLicenses: number | null;
  potentialSavings: number | null;
  lowUtilization: boolean;
};

export function computeUtilization(product: SoftwareProduct): SoftwareProductWithComputed {
  const { qtyPurchased, qtyActivelyUsed, annualCost } = product;
  if (!qtyPurchased || qtyActivelyUsed === null || qtyActivelyUsed === undefined) {
    return { ...product, utilizationRate: null, unusedLicenses: null, potentialSavings: null, lowUtilization: false };
  }
  const utilizationRate = Math.round((qtyActivelyUsed / qtyPurchased) * 10000) / 10000;
  const unusedLicenses = qtyPurchased - qtyActivelyUsed;
  const potentialSavings =
    product.licenseModel === 'per_user' && product.unitCost && unusedLicenses > 0
      ? Math.round(product.unitCost.toNumber() * unusedLicenses * 100) / 100
      : null;
  const lowUtilization = utilizationRate < 0.70;
  return { ...product, utilizationRate, unusedLicenses, potentialSavings, lowUtilization };
}

@Injectable()
export class SoftwareProductsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(filters?: {
    status?: SoftwareStatus;
    departmentId?: string;
  }): Promise<SoftwareProductWithComputed[]> {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    const products = await this.prisma.softwareProduct.findMany({ where, orderBy: { createdAt: 'desc' } });
    return products.map(computeUtilization);
  }

  async findOne(id: string): Promise<SoftwareProductWithComputed> {
    const product = await this.prisma.softwareProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`SoftwareProduct ${id} not found`);
    return computeUtilization(product);
  }

  async create(dto: CreateSoftwareProductDto, actorId: string): Promise<SoftwareProductWithComputed> {
    const product = await this.prisma.softwareProduct.create({
      data: {
        name: dto.name,
        licenseModel: dto.licenseModel,
        qtyPurchased: dto.licenseCount,
        qtyActivelyUsed: dto.usersCount,
        annualCost: dto.annualCost !== undefined ? dto.annualCost : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
        status: dto.status,
        recommendedAction: dto.recommendedAction,
        notes: dto.notes,
        departmentId: dto.departmentId,
        vendorId: dto.vendorId,
      },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'SoftwareProduct',
      entityId: product.id,
      newValue: { name: product.name, status: product.status },
    });
    return computeUtilization(product);
  }

  async update(id: string, dto: UpdateSoftwareProductDto, actorId: string): Promise<SoftwareProductWithComputed> {
    const existing = await this.findOne(id);
    const d = dto as Partial<CreateSoftwareProductDto>;
    const product = await this.prisma.softwareProduct.update({
      where: { id },
      data: {
        name: d.name,
        licenseModel: d.licenseModel,
        qtyPurchased: d.licenseCount,
        qtyActivelyUsed: d.usersCount,
        annualCost: d.annualCost !== undefined ? d.annualCost : undefined,
        renewalDate: d.renewalDate ? new Date(d.renewalDate) : undefined,
        status: d.status,
        recommendedAction: d.recommendedAction,
        notes: d.notes,
        departmentId: d.departmentId,
        vendorId: d.vendorId,
      },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'SoftwareProduct',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: product.status },
    });
    return computeUtilization(product);
  }

  async remove(id: string, actorId: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.prisma.softwareProduct.update({
      where: { id },
      data: { status: SoftwareStatus.terminated },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'SoftwareProduct',
      entityId: id,
    });
    return { deleted: true };
  }
}
