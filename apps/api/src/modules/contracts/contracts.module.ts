import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ImportExportModule } from '../import-export/import-export.module';

@Module({
  imports: [AuditLogModule, ImportExportModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
