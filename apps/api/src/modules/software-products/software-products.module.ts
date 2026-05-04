import { Module } from '@nestjs/common';
import { SoftwareProductsController } from './software-products.controller';
import { SoftwareProductsService } from './software-products.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ImportExportModule } from '../import-export/import-export.module';

@Module({
  imports: [AuditLogModule, ImportExportModule],
  controllers: [SoftwareProductsController],
  providers: [SoftwareProductsService],
})
export class SoftwareProductsModule {}
