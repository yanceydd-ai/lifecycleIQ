import { BadRequestException, Injectable } from '@nestjs/common';
import { HardwareAsset, SoftwareProduct, Contract } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computeForecast } from '../budget/budget.service';
import { ForecastYear } from '@lifecycleiq/shared';

const DEFAULT_FORECAST_YEARS = 7;

interface OverrideInput {
  entityType: string;
  entityId: string;
  overrideType: string;
  value: string;
}

export function computeScenarioForecast(
  assets: HardwareAsset[],
  software: SoftwareProduct[],
  contracts: Contract[],
  settings: { fiscalYearStartMonth: number; defaultEscalationRate: number },
  overrides: OverrideInput[],
  scenarioEscalationRate: number,
  years: number,
  today: Date,
): ForecastYear[] {
  const om = new Map<string, string>();
  for (const o of overrides) {
    om.set(`${o.entityType}:${o.entityId}:${o.overrideType}`, o.value);
  }

  const modifiedAssets: HardwareAsset[] = assets
    .filter(a => om.get(`hardware_asset:${a.id}:exclude`) !== 'true')
    .map(a => {
      const deferYear = om.get(`hardware_asset:${a.id}:defer_year`);
      const costStr = om.get(`hardware_asset:${a.id}:cost`);
      if (!deferYear && !costStr) return a;
      const modified: any = { ...a };
      if (deferYear) modified.replacementYearOverride = parseInt(deferYear, 10);
      if (costStr) modified.replacementCost = { toNumber: () => parseFloat(costStr) };
      return modified as HardwareAsset;
    });

  const modifiedSoftware: SoftwareProduct[] = software
    .filter(s => om.get(`software_product:${s.id}:exclude`) !== 'true')
    .map(s => {
      const costStr = om.get(`software_product:${s.id}:cost`);
      if (!costStr) return s;
      return { ...s, annualCost: { toNumber: () => parseFloat(costStr) } as any };
    });

  const modifiedContracts: Contract[] = contracts
    .filter(c => om.get(`contract:${c.id}:exclude`) !== 'true')
    .map(c => {
      const costStr = om.get(`contract:${c.id}:cost`);
      if (!costStr) return c;
      return { ...c, annualCost: { toNumber: () => parseFloat(costStr) } as any };
    });

  return computeForecast(
    modifiedAssets,
    modifiedSoftware,
    modifiedContracts,
    { ...settings, defaultEscalationRate: scenarioEscalationRate },
    years,
    today,
  );
}

@Injectable()
export class ScenariosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.scenario.findMany({
      include: { overrides: true },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    return this.prisma.scenario.findUniqueOrThrow({
      where: { id },
      include: { overrides: true },
    });
  }

  async create(dto: { name: string; escalationRate: number }, userId: string) {
    return this.prisma.scenario.create({
      data: {
        name: dto.name,
        type: 'custom',
        escalationRate: dto.escalationRate,
        isSystem: false,
        createdBy: userId,
      },
      include: { overrides: true },
    });
  }

  async update(id: string, dto: { name?: string; escalationRate?: number; isRecommended?: boolean }) {
    const data = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    return this.prisma.scenario.update({
      where: { id },
      data,
      include: { overrides: true },
    });
  }

  async remove(id: string): Promise<void> {
    const scenario = await this.prisma.scenario.findUniqueOrThrow({ where: { id } });
    if (scenario.isSystem) {
      throw new BadRequestException('System scenarios cannot be deleted');
    }
    await this.prisma.scenario.delete({ where: { id } });
  }

  async getForecast(id: string): Promise<ForecastYear[]> {
    const scenario = await this.findOne(id);
    const settings = await this.prisma.fiscalYearSettings.findFirst();
    const fiscalSettings = {
      fiscalYearStartMonth: settings?.fiscalYearStartMonth ?? 1,
      defaultEscalationRate: settings ? Number(settings.defaultEscalationRate) : 0.03,
    };
    const [assets, software, contracts] = await Promise.all([
      this.prisma.hardwareAsset.findMany(),
      this.prisma.softwareProduct.findMany(),
      this.prisma.contract.findMany(),
    ]);
    return computeScenarioForecast(
      assets,
      software,
      contracts,
      fiscalSettings,
      scenario.overrides,
      Number(scenario.escalationRate),
      DEFAULT_FORECAST_YEARS,
      new Date(),
    );
  }

  async upsertOverride(scenarioId: string, dto: {
    entityType: string;
    entityId: string;
    overrideType: string;
    value: string;
  }) {
    await this.prisma.scenario.findUniqueOrThrow({ where: { id: scenarioId } });
    return this.prisma.scenarioOverride.upsert({
      where: {
        scenarioId_entityType_entityId_overrideType: {
          scenarioId,
          entityType: dto.entityType,
          entityId: dto.entityId,
          overrideType: dto.overrideType,
        },
      },
      create: {
        scenarioId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        overrideType: dto.overrideType,
        value: dto.value,
      },
      update: { value: dto.value },
    });
  }

  async removeOverride(scenarioId: string, overrideId: string): Promise<void> {
    await this.prisma.scenarioOverride.delete({ where: { id: overrideId, scenarioId } });
  }
}
