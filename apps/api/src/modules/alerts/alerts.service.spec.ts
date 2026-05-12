import { computeAlerts } from './alerts.service';

const TODAY = new Date('2026-05-08');

function daysOut(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d;
}

function mockAsset(overrides: any = {}): any {
  return {
    id: 'hw-1', assetTag: 'HW-001', manufacturer: 'Dell', model: 'XPS 15',
    assetType: 'laptop', lifecycleStatus: 'active', criticality: 'medium',
    warrantyEndDate: null, supportEndDate: null,
    ...overrides,
  };
}

function mockSoftware(overrides: any = {}): any {
  return {
    id: 'sw-1', name: 'Microsoft 365', status: 'active',
    renewalDate: null, noticePeriodDays: null, autoRenewal: false, recommendedAction: null,
    ...overrides,
  };
}

function mockContract(overrides: any = {}): any {
  return {
    id: 'ct-1', name: 'Dell Support',
    renewalDate: null, noticePeriodDays: null, autoRenewal: false, recommendedAction: null,
    ...overrides,
  };
}

describe('computeAlerts', () => {
  it('returns empty array when no entities', () => {
    expect(computeAlerts([], [], [], TODAY)).toEqual([]);
  });

  it('produces warranty_expiring alert when warrantyEndDate within 120 days', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(45) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.some(a => a.alertType === 'warranty_expiring')).toBe(true);
  });

  it('produces no warranty alert when warrantyEndDate is more than 120 days out', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(130) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.some(a => a.alertType === 'warranty_expiring')).toBe(false);
  });

  it('sets severity=critical when warrantyEndDate within 29 days', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(20) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    const alert = alerts.find(a => a.alertType === 'warranty_expiring')!;
    expect(alert.severity).toBe('critical');
  });

  it('sets severity=high when warrantyEndDate is 30-59 days out', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(40) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    const alert = alerts.find(a => a.alertType === 'warranty_expiring')!;
    expect(alert.severity).toBe('high');
  });

  it('produces high_risk_unsupported when supportEndDate past and mission_critical', () => {
    const asset = mockAsset({ supportEndDate: daysOut(-10), criticality: 'mission_critical' });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.some(a => a.alertType === 'high_risk_unsupported')).toBe(true);
    expect(alerts.find(a => a.alertType === 'high_risk_unsupported')!.severity).toBe('critical');
  });

  it('does not produce high_risk_unsupported when criticality is high (not mission_critical)', () => {
    const asset = mockAsset({ supportEndDate: daysOut(-10), criticality: 'high' });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.some(a => a.alertType === 'high_risk_unsupported')).toBe(false);
  });

  it('excludes retired assets from all alert checks', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(10), lifecycleStatus: 'retired' });
    expect(computeAlerts([asset], [], [], TODAY)).toHaveLength(0);
  });

  it('excludes disposed assets from all alert checks', () => {
    const asset = mockAsset({ supportEndDate: daysOut(-5), criticality: 'mission_critical', lifecycleStatus: 'disposed' });
    expect(computeAlerts([asset], [], [], TODAY)).toHaveLength(0);
  });

  it('computes cancellation_deadline from renewalDate minus noticePeriodDays for software', () => {
    const sw = mockSoftware({ renewalDate: daysOut(40), noticePeriodDays: 30 });
    const alerts = computeAlerts([], [sw], [], TODAY);
    const alert = alerts.find(a => a.alertType === 'cancellation_deadline')!;
    expect(alert).toBeDefined();
    expect(alert.daysUntilDue).toBe(10);
    expect(alert.severity).toBe('critical');
  });

  it('produces auto_renewal_unreviewed when autoRenewal=true and no recommendedAction', () => {
    const sw = mockSoftware({ autoRenewal: true, recommendedAction: null });
    const alerts = computeAlerts([], [sw], [], TODAY);
    expect(alerts.some(a => a.alertType === 'auto_renewal_unreviewed')).toBe(true);
    expect(alerts.find(a => a.alertType === 'auto_renewal_unreviewed')!.severity).toBe('critical');
  });

  it('does not produce auto_renewal_unreviewed when recommendedAction is set', () => {
    const sw = mockSoftware({ autoRenewal: true, recommendedAction: 'renew_as_is' });
    const alerts = computeAlerts([], [sw], [], TODAY);
    expect(alerts.some(a => a.alertType === 'auto_renewal_unreviewed')).toBe(false);
  });

  it('excludes terminated software from all alert checks', () => {
    const sw = mockSoftware({ status: 'terminated', renewalDate: daysOut(10), autoRenewal: true });
    expect(computeAlerts([], [sw], [], TODAY)).toHaveLength(0);
  });

  it('produces renewal_due for contract within 60 days with severity=high', () => {
    const contract = mockContract({ renewalDate: daysOut(55) });
    const alerts = computeAlerts([], [], [contract], TODAY);
    const alert = alerts.find(a => a.alertType === 'renewal_due')!;
    expect(alert).toBeDefined();
    expect(alert.severity).toBe('high');
  });

  it('alert id is deterministic for same entity and alert type', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(10) });
    const r1 = computeAlerts([asset], [], [], TODAY);
    const r2 = computeAlerts([asset], [], [], TODAY);
    expect(r1[0].id).toBe(r2[0].id);
  });

  it('sorts critical alerts before high before medium before low', () => {
    const assetCritical = mockAsset({ id: 'hw-a', warrantyEndDate: daysOut(5) });
    const assetHigh = mockAsset({ id: 'hw-b', warrantyEndDate: daysOut(45) });
    const alerts = computeAlerts([assetHigh, assetCritical], [], [], TODAY);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[1].severity).toBe('high');
  });

  it('produces support_ending alert when supportEndDate within 120 days', () => {
    const asset = mockAsset({ supportEndDate: daysOut(50) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.some(a => a.alertType === 'support_ending')).toBe(true);
    expect(alerts.find(a => a.alertType === 'support_ending')!.severity).toBe('high');
  });

  it('sets severity=medium when date is 60-89 days out', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(75) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.find(a => a.alertType === 'warranty_expiring')!.severity).toBe('medium');
  });

  it('sets severity=low when date is 90-120 days out', () => {
    const asset = mockAsset({ warrantyEndDate: daysOut(100) });
    const alerts = computeAlerts([asset], [], [], TODAY);
    expect(alerts.find(a => a.alertType === 'warranty_expiring')!.severity).toBe('low');
  });

  it('excludes replaced software from all alert checks', () => {
    const sw = mockSoftware({ status: 'replaced', renewalDate: daysOut(10), autoRenewal: true });
    expect(computeAlerts([], [sw], [], TODAY)).toHaveLength(0);
  });

  it('produces cancellation_deadline for contract from renewalDate minus noticePeriodDays', () => {
    const contract = mockContract({ renewalDate: daysOut(40), noticePeriodDays: 30 });
    const alerts = computeAlerts([], [], [contract], TODAY);
    const alert = alerts.find(a => a.alertType === 'cancellation_deadline')!;
    expect(alert).toBeDefined();
    expect(alert.daysUntilDue).toBe(10);
  });

  it('produces auto_renewal_unreviewed for contract when autoRenewal=true and no recommendedAction', () => {
    const contract = mockContract({ autoRenewal: true, recommendedAction: null });
    const alerts = computeAlerts([], [], [contract], TODAY);
    expect(alerts.some(a => a.alertType === 'auto_renewal_unreviewed' && a.entityType === 'contract')).toBe(true);
  });
});
