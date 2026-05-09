export interface Alert {
  id: string;
  entityType: 'hardware_asset' | 'software_product' | 'contract';
  entityId: string;
  entityName: string;
  alertType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  dueDate: string | null;
  daysUntilDue: number | null;
}
