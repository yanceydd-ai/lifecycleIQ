import { Injectable } from '@nestjs/common';
import { HardwareAsset, SoftwareProduct, Contract } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateFiscalYearSettingsDto } from './dto/update-fiscal-year-settings.dto';
import { ForecastYear } from '@lifecycleiq/shared';

export function computeForecast(
  assets: HardwareAsset[],
  softwareProducts: SoftwareProduct[],
  contracts: Contract[],
  settings: { fiscalYearStartMonth: number; defaultEscalationRate: number },
  years: number,
  today: Date,
): ForecastYear[] {
  const { fiscalYearStartMonth } = settings;
  const rate = Number(settings.defaultEscalationRate);

  const currentFiscalYear =
    today.getMonth() + 1 >= fiscalYearStartMonth
      ? today.getFullYear()
      : today.getFullYear() - 1;

  const EXCLUDED_FROM_MAINTENANCE = ['retired', 'disposed', 'ordered', 'planned'];
  const result: ForecastYear[] = [];

  for (let i = 0; i < years; i++) {
    const fiscalYear = currentFiscalYear + i;
    const escalation = Math.pow(1 + rate, i);
    const fyStart = new Date(fiscalYear, fiscalYearStartMonth - 1, 1);

    let hardwareReplacement = 0;
    for (const asset of assets) {
      const replacementYear =
        asset.replacementYearOverride !== null && asset.replacementYearOverride !== undefined
          ? asset.replacementYearOverride
          : asset.purchaseDate && asset.usefulLifeYears
          ? new Date(asset.purchaseDate).getUTCFullYear() + asset.usefulLifeYears
          : null;

      if (
        replacementYear === fiscalYear &&
        asset.lifecycleStatus !== 'retired' &&
        asset.lifecycleStatus !== 'disposed'
      ) {
        const cost = asset.replacementCost ?? asset.purchaseCost;
        if (cost) hardwareReplacement += (cost as any).toNumber();
      }
    }

    let hardwareMaintenance = 0;
    for (const asset of assets) {
      if (!EXCLUDED_FROM_MAINTENANCE.includes(asset.lifecycleStatus) && (asset as any).annualMaintenanceCost) {
        hardwareMaintenance += (asset as any).annualMaintenanceCost.toNumber() * escalation;
      }
    }

    let software = 0;
    for (const product of softwareProducts) {
      if (product.status !== 'terminated' && product.status !== 'replaced' && product.annualCost) {
        software += (product.annualCost as any).toNumber() * escalation;
      }
    }

    let contractsTotal = 0;
    for (const contract of contracts) {
      const isActive = !contract.endDate || contract.endDate >= fyStart;
      if (isActive && contract.annualCost) {
        contractsTotal += (contract.annualCost as any).toNumber() * escalation;
      }
    }

    const capex = hardwareReplacement;
    const opex = hardwareMaintenance + software + contractsTotal;

    result.push({
      fiscalYear,
      capex,
      opex,
      total: capex + opex,
      isSpike: false,
      breakdown: { hardwareReplacement, hardwareMaintenance, software, contracts: contractsTotal },
    });
  }

  for (let i = 1; i < result.length; i++) {
    const priorTotals = result.slice(0, i).map(y => y.total);
    const rollingAvg = priorTotals.reduce((s, t) => s + t, 0) / priorTotals.length;
    result[i].isSpike = result[i].total > rollingAvg * 1.30;
  }

  return result;
}

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.fiscalYearSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.fiscalYearSettings.create({
        data: { fiscalYearStartMonth: 1, defaultEscalationRate: 0.03 },
      });
    }
    return settings;
  }

  async updateSettings(dto: UpdateFiscalYearSettingsDto) {
    const existing = await this.getSettings();
    return this.prisma.fiscalYearSettings.update({
      where: { id: existing.id },
      data: {
        fiscalYearStartMonth: dto.fiscalYearStartMonth,
        defaultEscalationRate: dto.defaultEscalationRate,
      },
    });
  }

  async getForecast(years: number): Promise<ForecastYear[]> {
    const settings = await this.getSettings();
    const [assets, softwareProducts, contracts] = await Promise.all([
      this.prisma.hardwareAsset.findMany(),
      this.prisma.softwareProduct.findMany(),
      this.prisma.contract.findMany(),
    ]);

    return computeForecast(
      assets,
      softwareProducts,
      contracts,
      {
        fiscalYearStartMonth: settings.fiscalYearStartMonth,
        defaultEscalationRate: Number(settings.defaultEscalationRate),
      },
      years,
      new Date(),
    );
  }
}
