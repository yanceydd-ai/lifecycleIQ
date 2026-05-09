import { Injectable } from '@nestjs/common';
import { HardwareAsset, SoftwareProduct, Contract } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Alert, AlertType, AlertSeverity, AlertEntityType } from '@lifecycleiq/shared';

function diffDays(target: Date, from: Date): number {
  return Math.ceil((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function severity(days: number): AlertSeverity {
  if (days < 30) return 'critical';
  if (days < 60) return 'high';
  if (days < 90) return 'medium';
  return 'low';
}

const EXCLUDED_HW = ['retired', 'disposed'];
const EXCLUDED_SW = ['terminated', 'replaced'];
const WINDOW = 120;

export function computeAlerts(
  assets: HardwareAsset[],
  software: SoftwareProduct[],
  contracts: Contract[],
  today: Date,
): Alert[] {
  const alerts: Alert[] = [];

  for (const asset of assets) {
    if (EXCLUDED_HW.includes(asset.lifecycleStatus)) continue;
    const name = [asset.manufacturer, asset.model].filter(Boolean).join(' ') || asset.assetTag || asset.id;

    if (asset.warrantyEndDate) {
      const days = diffDays(asset.warrantyEndDate, today);
      if (days >= 0 && days <= WINDOW) {
        alerts.push({
          id: `hardware_asset:${asset.id}:warranty_expiring`,
          entityType: 'hardware_asset' as AlertEntityType,
          entityId: asset.id,
          entityName: name,
          alertType: 'warranty_expiring' as AlertType,
          severity: severity(days),
          message: `${name} warranty expires in ${days} day${days === 1 ? '' : 's'}`,
          dueDate: asset.warrantyEndDate.toISOString().split('T')[0],
          daysUntilDue: days,
        });
      }
    }

    if (asset.supportEndDate) {
      const days = diffDays(asset.supportEndDate, today);
      if (days >= 0 && days <= WINDOW) {
        alerts.push({
          id: `hardware_asset:${asset.id}:support_ending`,
          entityType: 'hardware_asset' as AlertEntityType,
          entityId: asset.id,
          entityName: name,
          alertType: 'support_ending' as AlertType,
          severity: severity(days),
          message: `${name} support ends in ${days} day${days === 1 ? '' : 's'}`,
          dueDate: asset.supportEndDate.toISOString().split('T')[0],
          daysUntilDue: days,
        });
      } else if (days < 0 && asset.criticality === 'mission_critical') {
        alerts.push({
          id: `hardware_asset:${asset.id}:high_risk_unsupported`,
          entityType: 'hardware_asset' as AlertEntityType,
          entityId: asset.id,
          entityName: name,
          alertType: 'high_risk_unsupported' as AlertType,
          severity: 'critical' as AlertSeverity,
          message: `${name} is unsupported and mission-critical`,
          dueDate: null,
          daysUntilDue: null,
        });
      }
    }
  }

  for (const sw of software) {
    if (EXCLUDED_SW.includes(sw.status)) continue;
    const name = sw.name;

    if (sw.renewalDate) {
      const days = diffDays(sw.renewalDate, today);
      if (days >= 0 && days <= WINDOW) {
        alerts.push({
          id: `software_product:${sw.id}:renewal_due`,
          entityType: 'software_product' as AlertEntityType,
          entityId: sw.id,
          entityName: name,
          alertType: 'renewal_due' as AlertType,
          severity: severity(days),
          message: `${name} renewal due in ${days} day${days === 1 ? '' : 's'}`,
          dueDate: sw.renewalDate.toISOString().split('T')[0],
          daysUntilDue: days,
        });
      }

      if (sw.noticePeriodDays) {
        const deadline = new Date(sw.renewalDate);
        deadline.setDate(deadline.getDate() - sw.noticePeriodDays);
        const cancelDays = diffDays(deadline, today);
        if (cancelDays >= 0 && cancelDays <= WINDOW) {
          alerts.push({
            id: `software_product:${sw.id}:cancellation_deadline`,
            entityType: 'software_product' as AlertEntityType,
            entityId: sw.id,
            entityName: name,
            alertType: 'cancellation_deadline' as AlertType,
            severity: severity(cancelDays),
            message: `${name} cancellation deadline in ${cancelDays} day${cancelDays === 1 ? '' : 's'}`,
            dueDate: deadline.toISOString().split('T')[0],
            daysUntilDue: cancelDays,
          });
        }
      }
    }

    if (sw.autoRenewal && !sw.recommendedAction) {
      alerts.push({
        id: `software_product:${sw.id}:auto_renewal_unreviewed`,
        entityType: 'software_product' as AlertEntityType,
        entityId: sw.id,
        entityName: name,
        alertType: 'auto_renewal_unreviewed' as AlertType,
        severity: 'critical' as AlertSeverity,
        message: `${name} has auto-renewal enabled with no decision on record`,
        dueDate: null,
        daysUntilDue: null,
      });
    }
  }

  for (const contract of contracts) {
    const name = contract.name;

    if (contract.renewalDate) {
      const days = diffDays(contract.renewalDate, today);
      if (days >= 0 && days <= WINDOW) {
        alerts.push({
          id: `contract:${contract.id}:renewal_due`,
          entityType: 'contract' as AlertEntityType,
          entityId: contract.id,
          entityName: name,
          alertType: 'renewal_due' as AlertType,
          severity: severity(days),
          message: `${name} renewal due in ${days} day${days === 1 ? '' : 's'}`,
          dueDate: contract.renewalDate.toISOString().split('T')[0],
          daysUntilDue: days,
        });
      }

      if (contract.noticePeriodDays) {
        const deadline = new Date(contract.renewalDate);
        deadline.setDate(deadline.getDate() - contract.noticePeriodDays);
        const cancelDays = diffDays(deadline, today);
        if (cancelDays >= 0 && cancelDays <= WINDOW) {
          alerts.push({
            id: `contract:${contract.id}:cancellation_deadline`,
            entityType: 'contract' as AlertEntityType,
            entityId: contract.id,
            entityName: name,
            alertType: 'cancellation_deadline' as AlertType,
            severity: severity(cancelDays),
            message: `${name} cancellation deadline in ${cancelDays} day${cancelDays === 1 ? '' : 's'}`,
            dueDate: deadline.toISOString().split('T')[0],
            daysUntilDue: cancelDays,
          });
        }
      }
    }

    if (contract.autoRenewal && !contract.recommendedAction) {
      alerts.push({
        id: `contract:${contract.id}:auto_renewal_unreviewed`,
        entityType: 'contract' as AlertEntityType,
        entityId: contract.id,
        entityName: name,
        alertType: 'auto_renewal_unreviewed' as AlertType,
        severity: 'critical' as AlertSeverity,
        message: `${name} has auto-renewal enabled with no decision on record`,
        dueDate: null,
        daysUntilDue: null,
      });
    }
  }

  const order: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => {
    const sd = order[a.severity] - order[b.severity];
    if (sd !== 0) return sd;
    if (a.daysUntilDue !== null && b.daysUntilDue !== null) return a.daysUntilDue - b.daysUntilDue;
    return 0;
  });

  return alerts;
}

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async getAlerts(params?: { entityType?: string; severity?: string; days?: number }): Promise<Alert[]> {
    const [assets, software, contracts] = await Promise.all([
      this.prisma.hardwareAsset.findMany(),
      this.prisma.softwareProduct.findMany(),
      this.prisma.contract.findMany(),
    ]);

    let alerts = computeAlerts(assets, software, contracts, new Date());

    if (params?.entityType) alerts = alerts.filter(a => a.entityType === params.entityType);
    if (params?.severity) alerts = alerts.filter(a => a.severity === params.severity);
    if (params?.days !== undefined) {
      alerts = alerts.filter(a => a.daysUntilDue === null || a.daysUntilDue <= params.days!);
    }

    return alerts;
  }
}
