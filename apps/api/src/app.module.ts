import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { LocationsModule } from './modules/locations/locations.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { HardwareAssetsModule } from './modules/hardware-assets/hardware-assets.module';
import { SoftwareProductsModule } from './modules/software-products/software-products.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { BudgetModule } from './modules/budget/budget.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { ScenariosModule } from './modules/scenarios/scenarios.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    AuditLogModule,
    UsersModule,
    DepartmentsModule,
    LocationsModule,
    VendorsModule,
    HardwareAssetsModule,
    SoftwareProductsModule,
    ContractsModule,
    BudgetModule,
    AlertsModule,
    RecommendationsModule,
    ScenariosModule,
    ReportsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
