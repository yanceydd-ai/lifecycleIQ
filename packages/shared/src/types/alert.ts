export type AlertType =
  | 'warranty_expiring'
  | 'support_ending'
  | 'high_risk_unsupported'
  | 'renewal_due'
  | 'cancellation_deadline'
  | 'auto_renewal_unreviewed';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export type AlertEntityType = 'hardware_asset' | 'software_product' | 'contract';

export interface Alert {
  id: string;
  entityType: AlertEntityType;
  entityId: string;
  entityName: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  dueDate: string | null;
  daysUntilDue: number | null;
}
