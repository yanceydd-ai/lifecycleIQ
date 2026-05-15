import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsCronService } from './notifications-cron.service';
import { AlertsService } from '../alerts/alerts.service';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

const makeAlert = (overrides: Record<string, unknown> = {}): any => ({
  id: 'software_product:sw-1:renewal_due',
  entityType: 'software_product',
  entityId: 'sw-1',
  entityName: 'Adobe Creative Cloud',
  alertType: 'renewal_due',
  severity: 'high',
  message: 'Adobe Creative Cloud renewal due in 45 days',
  dueDate: '2026-06-28',
  daysUntilDue: 45,
  ...overrides,
});

describe('NotificationsCronService', () => {
  let service: NotificationsCronService;
  let alertsService: jest.Mocked<Pick<AlertsService, 'getAlerts'>>;
  let notificationsService: jest.Mocked<Pick<NotificationsService, 'sendAlertDigest'>>;
  let prisma: { notificationLog: { findMany: jest.Mock; createMany: jest.Mock } };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      notificationLog: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsCronService,
        { provide: AlertsService, useValue: { getAlerts: jest.fn().mockResolvedValue([]) } },
        { provide: NotificationsService, useValue: { sendAlertDigest: jest.fn().mockResolvedValue(undefined) } },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('smtp.example.com') } },
      ],
    }).compile();

    service = module.get<NotificationsCronService>(NotificationsCronService);
    alertsService = module.get(AlertsService);
    notificationsService = module.get(NotificationsService);
  });

  it('filters out non-time-sensitive alert types and sends nothing', async () => {
    alertsService.getAlerts.mockResolvedValue([
      makeAlert({ alertType: 'warranty_expiring' }),
      makeAlert({ alertType: 'support_ending' }),
      makeAlert({ alertType: 'high_risk_unsupported' }),
    ]);

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).not.toHaveBeenCalled();
    expect(prisma.notificationLog.createMany).not.toHaveBeenCalled();
  });

  it('skips email when all time-sensitive alerts are already logged', async () => {
    const alert = makeAlert();
    alertsService.getAlerts.mockResolvedValue([alert]);
    prisma.notificationLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        entityType: alert.entityType,
        entityId: alert.entityId,
        alertType: alert.alertType,
        severity: alert.severity,
        sentAt: new Date(),
      },
    ]);

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).not.toHaveBeenCalled();
    expect(prisma.notificationLog.createMany).not.toHaveBeenCalled();
  });

  it('sends digest only for new crossings and logs them', async () => {
    const newAlert = makeAlert({ entityId: 'sw-2', id: 'software_product:sw-2:renewal_due' });
    const existingAlert = makeAlert();

    alertsService.getAlerts.mockResolvedValue([newAlert, existingAlert]);
    prisma.notificationLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        entityType: existingAlert.entityType,
        entityId: existingAlert.entityId,
        alertType: existingAlert.alertType,
        severity: existingAlert.severity,
        sentAt: new Date(),
      },
    ]);

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).toHaveBeenCalledWith([newAlert]);
    expect(prisma.notificationLog.createMany).toHaveBeenCalledWith({
      data: [
        {
          entityType: newAlert.entityType,
          entityId: newAlert.entityId,
          alertType: newAlert.alertType,
          severity: newAlert.severity,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('does not write log rows when sendAlertDigest throws', async () => {
    alertsService.getAlerts.mockResolvedValue([makeAlert()]);
    prisma.notificationLog.findMany.mockResolvedValue([]);
    notificationsService.sendAlertDigest.mockRejectedValue(new Error('SMTP error'));

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).toHaveBeenCalled();
    expect(prisma.notificationLog.createMany).not.toHaveBeenCalled();
  });

  it('handles auto_renewal_unreviewed alerts (null daysUntilDue)', async () => {
    const alert = makeAlert({
      alertType: 'auto_renewal_unreviewed',
      severity: 'critical',
      dueDate: null,
      daysUntilDue: null,
    });
    alertsService.getAlerts.mockResolvedValue([alert]);
    prisma.notificationLog.findMany.mockResolvedValue([]);

    await service.runAlertNotifications();

    expect(notificationsService.sendAlertDigest).toHaveBeenCalledWith([alert]);
  });
});
