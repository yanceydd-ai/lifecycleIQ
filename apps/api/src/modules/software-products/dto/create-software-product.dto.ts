import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsNumberString, IsDateString, IsUUID } from 'class-validator';
import { LicenseModel, SoftwareStatus, RecommendedAction } from '@prisma/client';

export class CreateSoftwareProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional() @IsUUID()
  vendorId?: string;

  @IsOptional() @IsString()
  version?: string;

  @IsEnum(LicenseModel)
  licenseModel: LicenseModel;

  @IsOptional() @IsInt()
  licenseCount?: number;

  @IsOptional() @IsInt()
  usersCount?: number;

  @IsOptional() @IsNumberString()
  annualCost?: string;

  @IsOptional() @IsDateString()
  renewalDate?: string;

  @IsOptional() @IsEnum(SoftwareStatus)
  status?: SoftwareStatus;

  @IsOptional() @IsEnum(RecommendedAction)
  recommendedAction?: RecommendedAction;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsUUID()
  departmentId?: string;
}
