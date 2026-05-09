import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
