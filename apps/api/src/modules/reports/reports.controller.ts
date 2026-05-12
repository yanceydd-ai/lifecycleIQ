import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('executive-budget')
  getExecutiveBudget() {
    return this.service.getExecutiveBudget();
  }

  @Get('renewal-review')
  getRenewalReview() {
    return this.service.getRenewalReview();
  }

  @Get('capital-replacement')
  getCapitalReplacement() {
    return this.service.getCapitalReplacement();
  }

  @Get('software-optimization')
  getSoftwareOptimization() {
    return this.service.getSoftwareOptimization();
  }
}
