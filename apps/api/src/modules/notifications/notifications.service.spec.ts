import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

const mockAlert = (overrides: Record<string, unknown> = {}): any => ({
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

const smtpConfig: Record<string, string | number> = {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 587,
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'password',
  SMTP_FROM: 'alerts@example.com',
  ALERT_TO_EMAIL: 'admin@example.com',
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockSendMail: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSendMail = jest.fn().mockResolvedValue({});
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => smtpConfig[key]) },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('skips send and resolves without error when SMTP_HOST is not configured', async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();
    const noSmtpService = module.get<NotificationsService>(NotificationsService);

    await expect(noSmtpService.sendAlertDigest([mockAlert()])).resolves.toBeUndefined();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('builds subject with correct singular and plural forms', () => {
    expect(service.buildSubject([mockAlert()])).toBe(
      '[LifecycleIQ] 1 alert requires attention',
    );
    expect(service.buildSubject([mockAlert(), mockAlert()])).toBe(
      '[LifecycleIQ] 2 alerts require attention',
    );
  });

  it('orders alerts critical before high before medium in HTML', () => {
    const alerts = [
      mockAlert({ severity: 'medium', message: 'Medium alert' }),
      mockAlert({ severity: 'critical', message: 'Critical alert' }),
      mockAlert({ severity: 'high', message: 'High alert' }),
    ];
    const html = service.buildHtml(alerts);
    expect(html.indexOf('Critical alert')).toBeLessThan(html.indexOf('High alert'));
    expect(html.indexOf('High alert')).toBeLessThan(html.indexOf('Medium alert'));
  });

  it('sends email with correct from and to addresses', async () => {
    await service.sendAlertDigest([mockAlert()]);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'alerts@example.com',
        to: 'admin@example.com',
      }),
    );
  });

  it('throws when sendMail rejects so the cron job can retry', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

    await expect(service.sendAlertDigest([mockAlert()])).rejects.toThrow(
      'SMTP connection refused',
    );
  });
});
