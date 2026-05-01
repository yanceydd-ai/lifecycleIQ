import { Injectable, NotFoundException } from '@nestjs/common';
import { HardwareAsset } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateHardwareAssetDto } from './dto/create-hardware-asset.dto';
import { UpdateHardwareAssetDto } from './dto/update-hardware-asset.dto';

export type HardwareAssetWithComputed = HardwareAsset & {
  replacementYear: number | null;
  warrantyExpired: boolean;
  unsupported: boolean;
  highRisk: boolean;
};

export function computeHardwareFields(asset: HardwareAsset): HardwareAssetWithComputed {
  const today = new Date();
  const replacementYear =
    asset.replacementYearOverride !== null && asset.replacementYearOverride !== undefined
      ? asset.replacementYearOverride
      : asset.purchaseDate && asset.usefulLifeYears
        ? asset.purchaseDate.getUTCFullYear() + asset.usefulLifeYears
        : null;
  const warrantyExpired = asset.warrantyEndDate ? asset.warrantyEndDate < today : false;
  const unsupported = asset.supportEndDate ? asset.supportEndDate < today : false;
  const highRisk = unsupported && asset.criticality === 'mission_critical';
  return { ...asset, replacementYear, warrantyExpired, unsupported, highRisk };
}

@Injectable()
export class HardwareAssetsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(filters?: {
    lifecycleStatus?: string;
    assetType?: string;
    departmentId?: string;
    locationId?: string;
  }): Promise<HardwareAssetWithComputed[]> {
    const where: Record<string, unknown> = {};
    if (filters?.lifecycleStatus) where.lifecycleStatus = filters.lifecycleStatus;
    if (filters?.assetType) where.assetType = filters.assetType;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.locationId) where.locationId = filters.locationId;
    const assets = await this.prisma.hardwareAsset.findMany({ where, orderBy: { createdAt: 'desc' } });
    return assets.map(computeHardwareFields);
  }

  async findOne(id: string): Promise<HardwareAssetWithComputed> {
    const asset = await this.prisma.hardwareAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`HardwareAsset ${id} not found`);
    return computeHardwareFields(asset);
  }

  async create(dto: CreateHardwareAssetDto, actorId: string): Promise<HardwareAssetWithComputed> {
    const asset = await this.prisma.hardwareAsset.create({
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        supportEndDate: dto.supportEndDate ? new Date(dto.supportEndDate) : undefined,
      } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'HardwareAsset',
      entityId: asset.id,
      newValue: { assetType: asset.assetType, manufacturer: asset.manufacturer },
    });
    return computeHardwareFields(asset);
  }

  async update(id: string, dto: UpdateHardwareAssetDto, actorId: string): Promise<HardwareAssetWithComputed> {
    const existing = await this.findOne(id);
    const d = dto as Partial<CreateHardwareAssetDto>;
    const asset = await this.prisma.hardwareAsset.update({
      where: { id },
      data: {
        ...d,
        purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : undefined,
        warrantyEndDate: d.warrantyEndDate ? new Date(d.warrantyEndDate) : undefined,
        supportEndDate: d.supportEndDate ? new Date(d.supportEndDate) : undefined,
      } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'HardwareAsset',
      entityId: id,
      oldValue: { lifecycleStatus: existing.lifecycleStatus },
      newValue: { lifecycleStatus: asset.lifecycleStatus },
    });
    return computeHardwareFields(asset);
  }

  async remove(id: string, actorId: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.prisma.hardwareAsset.update({
      where: { id },
      data: { lifecycleStatus: 'retired' } as any,
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'HardwareAsset',
      entityId: id,
    });
    return { deleted: true };
  }
}
