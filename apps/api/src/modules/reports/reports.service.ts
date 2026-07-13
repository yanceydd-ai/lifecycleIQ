import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeForecast } from '../budget/budget.service';
import { computeRecommendation } from '../recommendations/recommendations.service';
import { computeHardwareFields } from '../hardware-assets/hardware-assets.service';
import {
  ExecutiveBudgetReport,
  RenewalReviewReport,
  CapitalReplacementReport,
  SoftwareOptimizationReport,
} from '@lifecycleiq/shared';

const RENEWAL_WINDOW_DAYS = 120;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async getFiscalSettings() {
    const s = await this.prisma.fiscalYearSettings.findFirst();
    if (!s) return { fiscalYearStartMonth: 1, defaultEscalationRate: 0.03, budgetSpikeThreshold: 0.30 };
    const rate = (s.defaultEscalationRate as any)?.toNumber
      ? (s.defaultEscalationRate as any).toNumber()
      : Number(s.defaultEscalationRate);
    const spike = (s.budgetSpikeThreshold as any)?.toNumber
      ? (s.budgetSpikeThreshold as any).toNumber()
      : Number(s.budgetSpikeThreshold);
    return { fiscalYearStartMonth: s.fiscalYearStartMonth, defaultEscalationRate: rate, budgetSpikeThreshold: spike };
  }

  private currentFiscalYear(fiscalYearStartMonth: number, today: Date): number {
    return today.getUTCMonth() + 1 >= fiscalYearStartMonth
      ? today.getUTCFullYear()
      : today.getUTCFullYear() - 1;
  }

  async getExecutiveBudget(): Promise<ExecutiveBudgetReport> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const settings = await this.getFiscalSettings();
    const [assets, software, contracts] = await Promise.all([
      this.prisma.hardwareAsset.findMany(),
      this.prisma.softwareProduct.findMany(),
      this.prisma.contract.findMany(),
    ]);

    const forecast = computeForecast(assets, software, contracts, settings, 7, today);
    const threeYearTotal = forecast.slice(0, 3).reduce((s, y) => s + y.total, 0);
    const sevenYearTotal = forecast.reduce((s, y) => s + y.total, 0);
    const spikeYears = forecast.filter(y => y.isSpike).map(y => y.fiscalYear);

    const cutoff = addDays(today, RENEWAL_WINDOW_DAYS);

    const contractRenewals = contracts
      .filter(c => c.renewalDate && c.renewalDate >= today && c.renewalDate <= cutoff && c.annualCost)
      .map(c => ({
        name: c.name,
        type: 'Contract',
        renewalDate: c.renewalDate!.toISOString().split('T')[0],
        cost: (c.annualCost as any).toNumber(),
      }));

    const softwareRenewals = software
      .filter(s => s.renewalDate && s.renewalDate >= today && s.renewalDate <= cutoff && s.annualCost)
      .map(s => ({
        name: s.name,
        type: 'Software',
        renewalDate: s.renewalDate!.toISOString().split('T')[0],
        cost: (s.annualCost as any).toNumber(),
      }));

    const topRenewals = [...contractRenewals, ...softwareRenewals]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    const currentFY = this.currentFiscalYear(settings.fiscalYearStartMonth, today);
    const topCapitalReplacements = assets
      .filter(a => a.lifecycleStatus !== 'retired' && a.lifecycleStatus !== 'disposed')
      .map(a => {
        const replacementYear =
          a.replacementYearOverride ??
          (a.purchaseDate && a.usefulLifeYears
            ? a.purchaseDate.getUTCFullYear() + a.usefulLifeYears
            : null);
        const cost = a.replacementCost ?? a.purchaseCost;
        return {
          name: [a.manufacturer, a.model].filter(Boolean).join(' ') || a.assetTag || a.id,
          assetType: a.assetType as string,
          replacementYear,
          cost: cost ? (cost as any).toNumber() : 0,
        };
      })
      .filter(a => a.replacementYear !== null && a.replacementYear >= currentFY && a.replacementYear <= currentFY + 6)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    const savingsOpportunities = software
      .filter(s => s.qtyPurchased && s.qtyPurchased > 0 && s.qtyActivelyUsed !== null && s.qtyActivelyUsed !== undefined && s.annualCost)
      .map(s => {
        const utilizationRate = s.qtyActivelyUsed! / s.qtyPurchased!;
        const annualCost = (s.annualCost as any).toNumber();
        const unusedLicenses = s.qtyPurchased! - s.qtyActivelyUsed!;
        const unitCost = s.unitCost ? (s.unitCost as any).toNumber() : annualCost / s.qtyPurchased!;
        const potentialSavings = unusedLicenses * unitCost;
        return { name: s.name, annualCost, utilizationRate, potentialSavings };
      })
      .filter(s => s.utilizationRate < 0.70)
      .sort((a, b) => b.potentialSavings - a.potentialSavings);

    const allRecs = [
      ...assets.map(a => computeRecommendation('hardware_asset', computeHardwareFields(a), today)),
      ...software.map(s => computeRecommendation('software_product', s, today)),
      ...contracts.map(c => computeRecommendation('contract', c, today)),
    ];
    const highPriorityRecommendations = allRecs
      .filter(r => r.score >= 70)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => ({
        name: r.entityName,
        entityType: r.entityType,
        action: r.recommendedAction,
        score: r.score,
        classification: r.classification,
      }));

    return {
      currentYearOpex: forecast[0]?.opex ?? 0,
      currentYearCapex: forecast[0]?.capex ?? 0,
      threeYearTotal,
      sevenYearTotal,
      spikeYears,
      topRenewals,
      topCapitalReplacements,
      savingsOpportunities,
      highPriorityRecommendations,
    };
  }

  async getRenewalReview(): Promise<RenewalReviewReport> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const cutoff = addDays(today, RENEWAL_WINDOW_DAYS);

    const [contracts, software] = await Promise.all([
      this.prisma.contract.findMany(),
      this.prisma.softwareProduct.findMany(),
    ]);

    const contractItems = contracts
      .filter(c => c.renewalDate && c.renewalDate >= today && c.renewalDate <= cutoff)
      .map(c => ({
        name: c.name,
        type: 'Contract',
        renewalDate: c.renewalDate!.toISOString().split('T')[0],
        cost: c.annualCost ? (c.annualCost as any).toNumber() : 0,
        recommendedAction: c.recommendedAction ?? null,
        approvalStatus: c.approvalStatus as string,
      }));

    const softwareItems = software
      .filter(s => s.renewalDate && s.renewalDate >= today && s.renewalDate <= cutoff)
      .map(s => ({
        name: s.name,
        type: 'Software',
        renewalDate: s.renewalDate!.toISOString().split('T')[0],
        cost: s.annualCost ? (s.annualCost as any).toNumber() : 0,
        recommendedAction: s.recommendedAction ?? null,
        approvalStatus: null,
      }));

    const upcomingRenewals = [...contractItems, ...softwareItems].sort((a, b) =>
      a.renewalDate.localeCompare(b.renewalDate),
    );

    const cancellationDeadlines = contracts
      .map(c => {
        let deadline: Date | null = null;
        if (c.cancellationDeadlineOverride) {
          deadline = c.cancellationDeadlineOverride;
        } else if (c.renewalDate && c.noticePeriodDays) {
          deadline = new Date(c.renewalDate.getTime() - c.noticePeriodDays * MS_PER_DAY);
        }
        return { c, deadline };
      })
      .filter(({ deadline }) => deadline && deadline >= today && deadline <= cutoff)
      .map(({ c, deadline }) => ({
        name: c.name,
        deadline: deadline!.toISOString().split('T')[0],
        renewalDate: c.renewalDate ? c.renewalDate.toISOString().split('T')[0] : '',
        cost: c.annualCost ? (c.annualCost as any).toNumber() : 0,
      }))
      .sort((a, b) => a.deadline.localeCompare(b.deadline));

    return { upcomingRenewals, cancellationDeadlines };
  }

  async getCapitalReplacement(): Promise<CapitalReplacementReport> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const settings = await this.getFiscalSettings();
    const currentFY = this.currentFiscalYear(settings.fiscalYearStartMonth, today);

    const assets = await this.prisma.hardwareAsset.findMany({
      include: { location: true, department: true },
    });

    const activeAssets = assets.filter(
      a => a.lifecycleStatus !== 'retired' && a.lifecycleStatus !== 'disposed',
    );

    const yearMap = new Map<number, typeof activeAssets>();
    for (let y = currentFY; y <= currentFY + 6; y++) yearMap.set(y, []);

    for (const a of activeAssets) {
      const replacementYear =
        a.replacementYearOverride ??
        (a.purchaseDate && a.usefulLifeYears
          ? a.purchaseDate.getUTCFullYear() + a.usefulLifeYears
          : null);
      if (replacementYear !== null && yearMap.has(replacementYear)) {
        yearMap.get(replacementYear)!.push(a);
      }
    }

    const byYear = Array.from(yearMap.entries())
      .filter(([, arr]) => arr.length > 0)
      .map(([fiscalYear, arr]) => ({
        fiscalYear,
        assets: arr.map(a => {
          const cost = a.replacementCost ?? a.purchaseCost;
          return {
            name: [a.manufacturer, a.model].filter(Boolean).join(' ') || a.assetTag || a.id,
            assetType: a.assetType as string,
            cost: cost ? (cost as any).toNumber() : 0,
            location: (a as any).location?.name ?? null,
            department: (a as any).department?.name ?? null,
          };
        }),
      }));

    const riskItems = assets
      .filter(a => (a.supportEndDate && a.supportEndDate < today) || (a.warrantyEndDate && a.warrantyEndDate < today))
      .map(a => ({
        name: [a.manufacturer, a.model].filter(Boolean).join(' ') || a.assetTag || a.id,
        assetTag: a.assetTag ?? null,
        criticality: a.criticality as string,
        supportEndDate: a.supportEndDate ? a.supportEndDate.toISOString().split('T')[0] : null,
        warrantyEndDate: a.warrantyEndDate ? a.warrantyEndDate.toISOString().split('T')[0] : null,
      }));

    return { byYear, riskItems };
  }

  async getSoftwareOptimization(): Promise<SoftwareOptimizationReport> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const software = await this.prisma.softwareProduct.findMany();

    const lowUtilization = software
      .filter(
        s =>
          s.qtyPurchased &&
          s.qtyPurchased > 0 &&
          s.qtyActivelyUsed !== null &&
          s.qtyActivelyUsed !== undefined &&
          s.status !== 'terminated',
      )
      .map(s => {
        const utilizationRate = s.qtyActivelyUsed! / s.qtyPurchased!;
        const annualCost = s.annualCost ? (s.annualCost as any).toNumber() : 0;
        const unusedLicenses = s.qtyPurchased! - s.qtyActivelyUsed!;
        const unitCost = s.unitCost
          ? (s.unitCost as any).toNumber()
          : s.qtyPurchased
          ? annualCost / s.qtyPurchased
          : 0;
        const potentialSavings = unusedLicenses * unitCost;
        return {
          name: s.name,
          utilizationRate,
          qtyPurchased: s.qtyPurchased!,
          qtyUsed: s.qtyActivelyUsed!,
          annualCost,
          potentialSavings,
        };
      })
      .filter(s => s.utilizationRate < 0.70)
      .sort((a, b) => b.potentialSavings - a.potentialSavings);

    const terminationCandidates = software
      .map(s => ({ s, rec: computeRecommendation('software_product', s, today) }))
      .filter(({ rec }) => rec.recommendedAction === 'terminate' || rec.recommendedAction === 'retire')
      .map(({ s, rec }) => ({
        name: s.name,
        annualCost: s.annualCost ? (s.annualCost as any).toNumber() : 0,
        action: rec.recommendedAction,
        score: rec.score,
      }))
      .sort((a, b) => b.score - a.score);

    return { lowUtilization, terminationCandidates };
  }
}
