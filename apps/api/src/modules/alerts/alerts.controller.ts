import { Controller, Get, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private service: AlertsService) {}

  @Get()
  getAlerts(
    @Query('entityType') entityType?: string,
    @Query('severity') severity?: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : undefined;
    return this.service.getAlerts({
      entityType,
      severity,
      days: daysNum !== undefined && !isNaN(daysNum) ? daysNum : undefined,
    });
  }
}
