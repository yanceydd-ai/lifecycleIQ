import { Injectable, NotFoundException } from '@nestjs/common';
import { HardwareAsset, LifecycleStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CsvService, ImportPreview } from '../import-export/csv.service';
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
    private csvService: CsvService,
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
        assetType: dto.assetType,
        assetTag: dto.assetTag,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchaseCost: dto.purchaseCost !== undefined ? dto.purchaseCost : undefined,
        replacementCost: dto.replacementCost !== undefined ? dto.replacementCost : undefined,
        usefulLifeYears: dto.usefulLifeYears,
        replacementYearOverride: dto.replacementYearOverride,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
        supportEndDate: dto.supportEndDate ? new Date(dto.supportEndDate) : undefined,
        lifecycleStatus: dto.lifecycleStatus,
        criticality: dto.criticality,
        fundingType: dto.fundingType,
        locationId: dto.locationId,
        departmentId: dto.departmentId,
        vendorId: dto.vendorId,
        assignedUserId: dto.assignedUserId,
        businessOwner: dto.businessOwner,
        technicalOwner: dto.technicalOwner,
        notes: dto.notes,
      },
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
        assetType: d.assetType,
        assetTag: d.assetTag,
        manufacturer: d.manufacturer,
        model: d.model,
        serialNumber: d.serialNumber,
        purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : undefined,
        purchaseCost: d.purchaseCost !== undefined ? d.purchaseCost : undefined,
        replacementCost: d.replacementCost !== undefined ? d.replacementCost : undefined,
        usefulLifeYears: d.usefulLifeYears,
        replacementYearOverride: d.replacementYearOverride,
        warrantyEndDate: d.warrantyEndDate ? new Date(d.warrantyEndDate) : undefined,
        supportEndDate: d.supportEndDate ? new Date(d.supportEndDate) : undefined,
        lifecycleStatus: d.lifecycleStatus,
        criticality: d.criticality,
        fundingType: d.fundingType,
        locationId: d.locationId,
        departmentId: d.departmentId,
        vendorId: d.vendorId,
        assignedUserId: d.assignedUserId,
        businessOwner: d.businessOwner,
        technicalOwner: d.technicalOwner,
        notes: d.notes,
      },
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
      data: { lifecycleStatus: LifecycleStatus.retired },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'HardwareAsset',
      entityId: id,
    });
    return { deleted: true };
  }

  async importPreview(csvString: string): Promise<ImportPreview> {
    const rows = this.csvService.parse(csvString);
    const validRows: Record<string, string>[] = [];
    const invalidRows: { rowNumber: number; data: Record<string, string>; errors: string[] }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: string[] = [];

      if (!row.assetTag) rowErrors.push('assetTag: required');

      const dto = plainToInstance(CreateHardwareAssetDto, row, { enableImplicitConversion: true });
      const validationErrors = await validate(dto);
      for (const err of validationErrors) {
        rowErrors.push(...Object.values(err.constraints ?? {}));
      }

      if (!rowErrors.length && row.assetTag) {
        const existing = await this.prisma.hardwareAsset.findFirst({
          where: { assetTag: row.assetTag },
        });
        if (existing) rowErrors.push('assetTag: already exists');
      }

      if (rowErrors.length > 0) {
        invalidRows.push({ rowNumber: i + 1, data: row, errors: rowErrors });
      } else {
        validRows.push(row);
      }
    }

    return { totalRows: rows.length, validRows, invalidRows };
  }

  async importConfirm(
    rows: Record<string, string>[],
    actorId: string,
  ): Promise<{ imported: number }> {
    const dtos = rows.map((row) =>
      plainToInstance(CreateHardwareAssetDto, row, { enableImplicitConversion: true }),
    );

    const created = await this.prisma.$transaction(
      dtos.map((dto) =>
        this.prisma.hardwareAsset.create({
          data: {
            assetType: dto.assetType,
            assetTag: dto.assetTag,
            manufacturer: dto.manufacturer,
            model: dto.model,
            serialNumber: dto.serialNumber,
            purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
            purchaseCost: dto.purchaseCost,
            usefulLifeYears: dto.usefulLifeYears,
            warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : undefined,
            supportEndDate: dto.supportEndDate ? new Date(dto.supportEndDate) : undefined,
            lifecycleStatus: dto.lifecycleStatus,
            criticality: dto.criticality,
            fundingType: dto.fundingType,
            notes: dto.notes,
          },
        }),
      ),
    );

    for (const asset of created) {
      await this.auditLog.log({
        userId: actorId,
        action: 'CREATE',
        entityType: 'HardwareAsset',
        entityId: asset.id,
      });
    }

    return { imported: created.length };
  }

  async exportCsv(): Promise<string> {
    const assets = await this.findAll();
    const columns: (keyof (typeof assets)[0])[] = [
      'id', 'assetTag', 'assetType', 'lifecycleStatus', 'criticality',
      'manufacturer', 'model', 'serialNumber', 'purchaseDate', 'usefulLifeYears',
      'purchaseCost', 'warrantyEndDate', 'supportEndDate', 'notes',
      'replacementYear', 'warrantyExpired', 'unsupported', 'highRisk',
      'createdAt', 'updatedAt',
    ];
    return this.csvService.serialize(assets, columns);
  }
}
