import { IsString, IsOptional, IsEnum, IsInt, IsNumberString, IsDateString, IsUUID } from 'class-validator';
import { AssetType, LifecycleStatus, Criticality, FundingType } from '@prisma/client';

export class CreateHardwareAssetDto {
  @IsEnum(AssetType)
  assetType: string;

  @IsOptional() @IsString()
  assetTag?: string;

  @IsOptional() @IsString()
  manufacturer?: string;

  @IsOptional() @IsString()
  model?: string;

  @IsOptional() @IsString()
  serialNumber?: string;

  @IsOptional() @IsDateString()
  purchaseDate?: string;

  @IsOptional() @IsNumberString()
  purchaseCost?: string;

  @IsOptional() @IsNumberString()
  replacementCost?: string;

  @IsOptional() @IsInt()
  usefulLifeYears?: number;

  @IsOptional() @IsInt()
  replacementYearOverride?: number;

  @IsOptional() @IsDateString()
  warrantyEndDate?: string;

  @IsOptional() @IsDateString()
  supportEndDate?: string;

  @IsOptional() @IsEnum(LifecycleStatus)
  lifecycleStatus?: string;

  @IsOptional() @IsEnum(Criticality)
  criticality?: string;

  @IsOptional() @IsEnum(FundingType)
  fundingType?: string;

  @IsOptional() @IsUUID()
  locationId?: string;

  @IsOptional() @IsUUID()
  departmentId?: string;

  @IsOptional() @IsUUID()
  vendorId?: string;

  @IsOptional() @IsUUID()
  assignedUserId?: string;

  @IsOptional() @IsString()
  businessOwner?: string;

  @IsOptional() @IsString()
  technicalOwner?: string;

  @IsOptional() @IsString()
  notes?: string;
}
