import { Module } from '@nestjs/common';
import { HardwareAssetsController } from './hardware-assets.controller';
import { HardwareAssetsService } from './hardware-assets.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ImportExportModule } from '../import-export/import-export.module';

@Module({
  imports: [AuditLogModule, ImportExportModule],
  controllers: [HardwareAssetsController],
  providers: [HardwareAssetsService],
})
export class HardwareAssetsModule {}
