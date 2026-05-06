import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { Role } from '@lifecycleiq/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { BudgetService } from './budget.service';
import { UpdateFiscalYearSettingsDto } from './dto/update-fiscal-year-settings.dto';

@Controller('budget')
export class BudgetController {
  constructor(private service: BudgetService) {}

  @Get('forecast')
  getForecast(@Query('years') years?: string) {
    const n = years ? parseInt(years, 10) : 7;
    return this.service.getForecast(!isNaN(n) && n >= 1 ? n : 7);
  }

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @Put('settings')
  @Roles(Role.Admin)
  updateSettings(@Body() dto: UpdateFiscalYearSettingsDto) {
    return this.service.updateSettings(dto);
  }
}
