import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Contract, ContractType, ApprovalStatus } from '@prisma/client';
import { subDays, differenceInDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

export type ContractWithComputed = Contract & {
  cancellationDeadline: Date | null;
  daysUntilRenewal: number | null;
  urgency: 'red' | 'amber' | 'green' | null;
};

export function computeContractDeadlines(contract: Contract): ContractWithComputed {
  if (!contract.endDate) {
    return { ...contract, cancellationDeadline: null, daysUntilRenewal: null, urgency: null };
  }
  const cancellationDeadline = contract.noticePeriodDays != null
    ? subDays(contract.endDate, contract.noticePeriodDays)
    : null;
  if (!cancellationDeadline) {
    return { ...contract, cancellationDeadline: null, daysUntilRenewal: null, urgency: null };
  }
  const today = new Date();
  const daysUntilRenewal = differenceInDays(cancellationDeadline, today);
  const urgency: 'red' | 'amber' | 'green' =
    daysUntilRenewal <= 30 ? 'red' : daysUntilRenewal <= 90 ? 'amber' : 'green';
  return { ...contract, cancellationDeadline, daysUntilRenewal, urgency };
}

@Injectable()
export class ContractsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async findAll(filters?: {
    contractType?: ContractType;
    departmentId?: string;
  }): Promise<ContractWithComputed[]> {
    const where: Record<string, unknown> = {};
    if (filters?.contractType) where.contractType = filters.contractType;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    const contracts = await this.prisma.contract.findMany({ where, orderBy: { createdAt: 'desc' } });
    return contracts.map(computeContractDeadlines);
  }

  async findOne(id: string): Promise<ContractWithComputed> {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException(`Contract ${id} not found`);
    return computeContractDeadlines(contract);
  }

  async create(dto: CreateContractDto, actorId: string): Promise<ContractWithComputed> {
    if (dto.vendorId && dto.softwareProductId) {
      throw new BadRequestException('A contract cannot link to both a vendor and a software product');
    }
    const contract = await this.prisma.contract.create({
      data: {
        name: dto.name,
        contractType: dto.contractType as ContractType,
        vendorId: dto.vendorId,
        softwareProductId: dto.softwareProductId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        noticePeriodDays: dto.noticePeriodDays,
        autoRenewal: dto.autoRenewal,
        annualCost: dto.annualCost !== undefined ? dto.annualCost : undefined,
        approvalStatus: dto.approvalStatus as ApprovalStatus,
        departmentId: dto.departmentId,
        notes: dto.notes,
      },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'CREATE',
      entityType: 'Contract',
      entityId: contract.id,
      newValue: { name: contract.name, contractType: contract.contractType },
    });
    return computeContractDeadlines(contract);
  }

  async update(id: string, dto: UpdateContractDto, actorId: string): Promise<ContractWithComputed> {
    const existing = await this.findOne(id);
    const d = dto as Partial<CreateContractDto>;
    const newVendorId = d.vendorId !== undefined ? d.vendorId : existing.vendorId;
    const newSoftwareProductId = d.softwareProductId !== undefined ? d.softwareProductId : existing.softwareProductId;
    if (newVendorId && newSoftwareProductId) {
      throw new BadRequestException('A contract cannot link to both a vendor and a software product');
    }
    const contract = await this.prisma.contract.update({
      where: { id },
      data: {
        name: d.name,
        contractType: d.contractType as ContractType,
        vendorId: d.vendorId,
        softwareProductId: d.softwareProductId,
        startDate: d.startDate ? new Date(d.startDate) : undefined,
        endDate: d.endDate ? new Date(d.endDate) : undefined,
        noticePeriodDays: d.noticePeriodDays,
        autoRenewal: d.autoRenewal,
        annualCost: d.annualCost !== undefined ? d.annualCost : undefined,
        approvalStatus: d.approvalStatus as ApprovalStatus,
        departmentId: d.departmentId,
        notes: d.notes,
      },
    });
    await this.auditLog.log({
      userId: actorId,
      action: 'UPDATE',
      entityType: 'Contract',
      entityId: id,
      oldValue: { approvalStatus: existing.approvalStatus },
      newValue: { approvalStatus: contract.approvalStatus },
    });
    return computeContractDeadlines(contract);
  }

  async remove(id: string, actorId: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.prisma.contract.delete({ where: { id } });
    await this.auditLog.log({
      userId: actorId,
      action: 'DELETE',
      entityType: 'Contract',
      entityId: id,
    });
    return { deleted: true };
  }
}
