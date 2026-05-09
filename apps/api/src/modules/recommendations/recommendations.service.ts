import { Injectable } from '@nestjs/common';
import { SoftwareProduct, Contract, RecommendedAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { computeHardwareFields, HardwareAssetWithComputed } from '../hardware-assets/hardware-assets.service';
import { Recommendation, RecommendedActionType, ScoreClassification, RecommendationEntityType } from '@lifecycleiq/shared';

function diffDays(target: Date, from: Date): number {
  return Math.ceil((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function classify(score: number): ScoreClassification {
  if (score >= 85) return 'Must fund';
  if (score >= 70) return 'Strongly recommended';
  if (score >= 50) return 'Plan carefully';
  if (score >= 30) return 'Optional or defer';
  return 'Retirement candidate';
}

function computeHardwareRec(
  asset: HardwareAssetWithComputed,
  today: Date,
): Omit<Recommendation, 'isOverridden' | 'overriddenAction'> {
  const currentYear = today.getFullYear();
  const critMap: Record<string, number> = { low: 25, medium: 50, high: 75, mission_critical: 100 };
  const criticalityScore = critMap[asset.criticality] ?? 50;

  const lifecycleRisk =
    asset.replacementYear === null ? 0
    : asset.replacementYear <= currentYear ? 100
    : asset.replacementYear === currentYear + 1 ? 75
    : asset.replacementYear === currentYear + 2 ? 50
    : 0;

  const securityRisk =
    asset.supportEndDate && asset.supportEndDate < today ? 100
    : asset.warrantyEndDate && asset.warrantyEndDate < today ? 50
    : 0;

  const impactMap: Record<string, number> = { due_for_replacement: 100, active: 50, spare: 25 };
  const userImpact = impactMap[asset.lifecycleStatus] ?? 0;

  const cost = asset.replacementCost ?? asset.purchaseCost;
  const costNum = cost ? (cost as any).toNumber() : 0;
  const financialUrgency = costNum > 10000 ? 100 : costNum > 5000 ? 75 : costNum > 1000 ? 50 : 25;

  const score = Math.round(
    criticalityScore * 0.30 +
    lifecycleRisk * 0.25 +
    securityRisk * 0.20 +
    userImpact * 0.15 +
    financialUrgency * 0.10,
  );

  let recommendedAction: RecommendedActionType = 'monitor';
  if (asset.unsupported && asset.criticality === 'mission_critical') recommendedAction = 'replace';
  else if (lifecycleRisk === 100) recommendedAction = 'replace';
  else if (asset.lifecycleStatus === 'due_for_replacement') recommendedAction = 'replace';
  else if (asset.lifecycleStatus === 'spare' && score < 30) recommendedAction = 'retire';

  const name = [asset.manufacturer, asset.model].filter(Boolean).join(' ') || asset.assetTag || asset.id;

  let explanation = `${name} is ${asset.lifecycleStatus}.`;
  if (recommendedAction === 'replace') {
    const reasons: string[] = [];
    if (securityRisk === 100) reasons.push('support has ended');
    if (lifecycleRisk === 100) reasons.push('replacement year has been reached');
    if (asset.lifecycleStatus === 'due_for_replacement') reasons.push('status is due for replacement');
    explanation = `${name}: ${reasons.join(' and ')}. Replacement is recommended.`;
    if (costNum > 0) explanation += ` Estimated cost: $${costNum.toLocaleString()}.`;
  } else {
    explanation += ` Priority score: ${score}.`;
  }

  return {
    entityType: 'hardware_asset' as RecommendationEntityType,
    entityId: asset.id,
    entityName: name,
    score,
    classification: classify(score),
    recommendedAction,
    explanation,
  };
}

function computeSoftwareRec(
  product: SoftwareProduct,
  today: Date,
): Omit<Recommendation, 'isOverridden' | 'overriddenAction'> {
  const criticalityScore = product.riskIfNotRenewed ? 75 : 50;

  const lifecycleRisk = !product.renewalDate ? 0 : (() => {
    const d = diffDays(product.renewalDate, today);
    return d < 30 ? 100 : d < 60 ? 75 : d < 90 ? 50 : d < 120 ? 25 : 0;
  })();

  const securityRisk =
    product.status === 'sunset_planned' ? 75
    : product.status === 'replaced' ? 50
    : 0;

  const utilization = product.qtyPurchased && product.qtyActivelyUsed !== null
    ? product.qtyActivelyUsed! / product.qtyPurchased
    : null;
  const userImpact = utilization === null ? 50 : utilization < 0.50 ? 25 : utilization < 0.70 ? 50 : 75;

  const annualCost = product.annualCost ? (product.annualCost as any).toNumber() : 0;
  const financialUrgency = annualCost > 50000 ? 100 : annualCost > 10000 ? 75 : annualCost > 1000 ? 50 : 25;

  const score = Math.round(
    criticalityScore * 0.30 +
    lifecycleRisk * 0.25 +
    securityRisk * 0.20 +
    userImpact * 0.15 +
    financialUrgency * 0.10,
  );

  let recommendedAction: RecommendedActionType = 'monitor';
  if (product.status === 'terminated') recommendedAction = 'terminate';
  else if (product.status === 'sunset_planned' || product.status === 'replaced') recommendedAction = 'replace';
  else if (product.status === 'renewal_pending') {
    recommendedAction = utilization !== null && utilization < 0.70 ? 'renew_with_reduction' : 'renew_as_is';
  } else if (utilization !== null && utilization < 0.50 && product.annualCost) {
    recommendedAction = 'renew_with_reduction';
  }

  let explanation = `${product.name} is ${product.status}.`;
  if (utilization !== null && product.qtyPurchased) {
    const used = product.qtyActivelyUsed ?? 0;
    explanation = `Only ${used} of ${product.qtyPurchased} licenses actively used (${Math.round(utilization * 100)}% utilization).`;
    if (recommendedAction === 'renew_with_reduction') explanation += ' Reducing license count at renewal could lower cost.';
  } else if (product.renewalDate) {
    const d = diffDays(product.renewalDate, today);
    if (d >= 0 && d <= 120) explanation += ` Renewal due in ${d} days.`;
  }

  return {
    entityType: 'software_product' as RecommendationEntityType,
    entityId: product.id,
    entityName: product.name,
    score,
    classification: classify(score),
    recommendedAction,
    explanation,
  };
}

function computeContractRec(
  contract: Contract,
  today: Date,
): Omit<Recommendation, 'isOverridden' | 'overriddenAction'> {
  const dueDate = contract.renewalDate ?? contract.endDate;
  const lifecycleRisk = !dueDate ? 0 : (() => {
    const d = diffDays(dueDate, today);
    return d < 30 ? 100 : d < 60 ? 75 : d < 90 ? 50 : d < 120 ? 25 : 0;
  })();

  const securityRisk =
    contract.approvalStatus === 'review_required' ? 75
    : contract.approvalStatus === 'not_reviewed' ? 50
    : 0;

  const annualCost = contract.annualCost ? (contract.annualCost as any).toNumber() : 0;
  const financialUrgency = annualCost > 50000 ? 100 : annualCost > 10000 ? 75 : annualCost > 1000 ? 50 : 25;

  const score = Math.round(
    50 * 0.30 +       // no criticality field on contracts — neutral mid-point
    lifecycleRisk * 0.25 +
    securityRisk * 0.20 +
    50 * 0.15 +       // no utilization concept for contracts — neutral mid-point
    financialUrgency * 0.10,
  );

  let recommendedAction: RecommendedActionType = 'monitor';
  if (lifecycleRisk >= 75 && annualCost > 10000) recommendedAction = 'renegotiate';
  else if (lifecycleRisk >= 50) recommendedAction = 'renew_as_is';

  let explanation = contract.name;
  if (annualCost > 0) explanation += ` ($${annualCost.toLocaleString()}/yr)`;
  if (dueDate) {
    const d = diffDays(dueDate, today);
    if (d >= 0) explanation += ` renews in ${d} days.`;
  }
  if (contract.autoRenewal) explanation += ' Auto-renewal is enabled.';

  return {
    entityType: 'contract' as RecommendationEntityType,
    entityId: contract.id,
    entityName: contract.name,
    score,
    classification: classify(score),
    recommendedAction,
    explanation,
  };
}

export function computeRecommendation(
  entityType: RecommendationEntityType,
  entity: HardwareAssetWithComputed | SoftwareProduct | Contract,
  today: Date,
): Omit<Recommendation, 'isOverridden' | 'overriddenAction'> {
  if (entityType === 'hardware_asset') return computeHardwareRec(entity as HardwareAssetWithComputed, today);
  if (entityType === 'software_product') return computeSoftwareRec(entity as SoftwareProduct, today);
  return computeContractRec(entity as Contract, today);
}

function withOverride(
  computed: Omit<Recommendation, 'isOverridden' | 'overriddenAction'>,
  storedAction: RecommendedActionType | null,
): Recommendation {
  const isOverridden = storedAction !== null && storedAction !== computed.recommendedAction;
  return { ...computed, isOverridden, overriddenAction: storedAction };
}

@Injectable()
export class RecommendationsService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async getRecommendations(params?: { entityType?: string; minScore?: number }): Promise<Recommendation[]> {
    const today = new Date();
    const [rawAssets, software, contracts] = await Promise.all([
      this.prisma.hardwareAsset.findMany(),
      this.prisma.softwareProduct.findMany(),
      this.prisma.contract.findMany(),
    ]);

    const results: Recommendation[] = [
      ...rawAssets.map(a => withOverride(
        computeRecommendation('hardware_asset', computeHardwareFields(a), today),
        a.recommendedAction ?? null,
      )),
      ...software.map(s => withOverride(
        computeRecommendation('software_product', s, today),
        s.recommendedAction ?? null,
      )),
      ...contracts.map(c => withOverride(
        computeRecommendation('contract', c, today),
        c.recommendedAction ?? null,
      )),
    ];

    let filtered = results;
    if (params?.entityType) filtered = filtered.filter(r => r.entityType === params.entityType);
    if (params?.minScore !== undefined) filtered = filtered.filter(r => r.score >= params.minScore!);

    return filtered.sort((a, b) => b.score - a.score);
  }

  async getRecommendation(entityType: string, id: string): Promise<Recommendation> {
    const today = new Date();
    if (entityType === 'hardware_asset') {
      const raw = await this.prisma.hardwareAsset.findUniqueOrThrow({ where: { id } });
      return withOverride(computeRecommendation('hardware_asset', computeHardwareFields(raw), today), raw.recommendedAction ?? null);
    }
    if (entityType === 'software_product') {
      const sw = await this.prisma.softwareProduct.findUniqueOrThrow({ where: { id } });
      return withOverride(computeRecommendation('software_product', sw, today), sw.recommendedAction ?? null);
    }
    const contract = await this.prisma.contract.findUniqueOrThrow({ where: { id } });
    return withOverride(computeRecommendation('contract', contract, today), contract.recommendedAction ?? null);
  }

  async override(
    entityType: string,
    id: string,
    dto: { newAction: RecommendedAction; rationale: string },
    userId: string,
  ) {
    let previousAction: string | null = null;

    if (entityType === 'hardware_asset') {
      const existing = await this.prisma.hardwareAsset.findUniqueOrThrow({ where: { id } });
      previousAction = existing.recommendedAction ?? null;
      await this.prisma.hardwareAsset.update({ where: { id }, data: { recommendedAction: dto.newAction } });
    } else if (entityType === 'software_product') {
      const existing = await this.prisma.softwareProduct.findUniqueOrThrow({ where: { id } });
      previousAction = existing.recommendedAction ?? null;
      await this.prisma.softwareProduct.update({ where: { id }, data: { recommendedAction: dto.newAction } });
    } else {
      const existing = await this.prisma.contract.findUniqueOrThrow({ where: { id } });
      previousAction = existing.recommendedAction ?? null;
      await this.prisma.contract.update({ where: { id }, data: { recommendedAction: dto.newAction } });
    }

    const history = await this.prisma.decisionHistory.create({
      data: { entityType, entityId: id, previousAction, newAction: dto.newAction, rationale: dto.rationale, userId },
    });

    await this.auditLog.log({
      userId,
      action: 'OVERRIDE',
      entityType,
      entityId: id,
      oldValue: { recommendedAction: previousAction },
      newValue: { recommendedAction: dto.newAction, rationale: dto.rationale },
    });

    return history;
  }

  async getDecisionHistory(entityType: string, entityId: string) {
    return this.prisma.decisionHistory.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
