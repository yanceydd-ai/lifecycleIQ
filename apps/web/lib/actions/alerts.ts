'use server';

import { apiServer } from '@/lib/api';
import type { Alert, AlertSeverity, AlertEntityType } from '@lifecycleiq/shared';

export async function getAlerts(params?: {
  entityType?: AlertEntityType;
  severity?: AlertSeverity;
  days?: number;
}): Promise<Alert[]> {
  const qs = new URLSearchParams();
  if (params?.entityType) qs.set('entityType', params.entityType);
  if (params?.severity) qs.set('severity', params.severity);
  if (params?.days !== undefined) qs.set('days', String(params.days));
  const query = qs.toString();
  return apiServer(`/api/v1/alerts${query ? `?${query}` : ''}`);
}
