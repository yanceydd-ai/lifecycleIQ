import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { NotificationsService } from './notifications.service';
import { Alert, AlertType } from '@lifecycleiq/shared';

const TIME_SENSITIVE_TYPES: AlertType[] = [
  'renewal_due',
  'cancellation_deadline',
  'auto_renewal_unreviewed',
];

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    private alertsService: AlertsService,
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Cron(process.env.ALERT_CRON_SCHEDULE ?? '0 8 * * *')
  async runAlertNotifications(): Promise<void> {
    // Skip entirely if SMTP not configured — avoids logging to notification_log
    // before email is enabled (which would suppress notifications after first config)
    if (!this.config.get<string>('SMTP_HOST')) {
      this.logger.debug('SMTP_HOST not set — skipping alert notifications');
      return;
    }

    try {
      const allAlerts = await this.alertsService.getAlerts();
      const timeSensitive = allAlerts.filter((a: Alert) =>
        TIME_SENSITIVE_TYPES.includes(a.alertType),
      );

      if (!timeSensitive.length) {
        this.logger.log('No time-sensitive alerts found');
        return;
      }

      const existing = await this.prisma.notificationLog.findMany({
        where: {
          OR: timeSensitive.map((a: Alert) => ({
            entityType: a.entityType,
            entityId: a.entityId,
            alertType: a.alertType,
            severity: a.severity,
          })),
        },
      });

      const loggedKeys = new Set(
        existing.map((e: any) => `${e.entityType}:${e.entityId}:${e.alertType}:${e.severity}`),
      );

      const newCrossings = timeSensitive.filter(
        (a: Alert) =>
          !loggedKeys.has(`${a.entityType}:${a.entityId}:${a.alertType}:${a.severity}`),
      );

      if (!newCrossings.length) {
        this.logger.log('No new alert crossings — skipping email');
        return;
      }

      this.logger.log(`Sending digest for ${newCrossings.length} new crossing(s)`);

      try {
        await this.notificationsService.sendAlertDigest(newCrossings);
      } catch (err) {
        this.logger.error('Failed to send alert digest — will retry on next run:', err);
        return;
      }

      await this.prisma.notificationLog.createMany({
        data: newCrossings.map((a: Alert) => ({
          entityType: a.entityType,
          entityId: a.entityId,
          alertType: a.alertType,
          severity: a.severity,
        })),
        skipDuplicates: true,
      });

      this.logger.log(`Logged ${newCrossings.length} notification(s)`);
    } catch (err) {
      this.logger.error('Alert notifications cron failed:', err);
    }
  }
}
