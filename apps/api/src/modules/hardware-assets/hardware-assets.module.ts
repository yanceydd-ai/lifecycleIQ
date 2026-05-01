import { Module } from '@nestjs/common';
import { HardwareAssetsController } from './hardware-assets.controller';
import { HardwareAssetsService } from './hardware-assets.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [HardwareAssetsController],
  providers: [HardwareAssetsService],
})
export class HardwareAssetsModule {}
