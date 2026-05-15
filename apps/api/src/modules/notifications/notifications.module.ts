import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsCronService } from './notifications-cron.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  providers: [NotificationsService, NotificationsCronService],
})
export class NotificationsModule {}
