import { IsString, IsOptional, IsEnum, IsInt, IsNumberString, IsDateString, IsUUID, MaxLength } from 'class-validator';
import { AssetType, LifecycleStatus, Criticality, FundingType } from '@prisma/client';

export class CreateHardwareAssetDto {
  @IsEnum(AssetType)
  assetType: AssetType;

  @IsOptional() @IsString() @MaxLength(100)
  assetTag?: string;

  @IsOptional() @IsString() @MaxLength(100)
  manufacturer?: string;

  @IsOptional() @IsString() @MaxLength(100)
  model?: string;

  @IsOptional() @IsString() @MaxLength(100)
  serialNumber?: string;

  @IsOptional() @IsDateString()
  purchaseDate?: string;

  @IsOptional() @IsNumberString()
  purchaseCost?: string;

  @IsOptional() @IsNumberString()
  replacementCost?: string;

  @IsOptional() @IsNumberString()
  annualMaintenanceCost?: string;

  @IsOptional() @IsInt()
  usefulLifeYears?: number;

  @IsOptional() @IsInt()
  replacementYearOverride?: number;

  @IsOptional() @IsDateString()
  warrantyEndDate?: string;

  @IsOptional() @IsDateString()
  supportEndDate?: string;

  @IsOptional() @IsEnum(LifecycleStatus)
  lifecycleStatus?: LifecycleStatus;

  @IsOptional() @IsEnum(Criticality)
  criticality?: Criticality;

  @IsOptional() @IsEnum(FundingType)
  fundingType?: FundingType;

  @IsOptional() @IsUUID()
  locationId?: string;

  @IsOptional() @IsUUID()
  departmentId?: string;

  @IsOptional() @IsUUID()
  vendorId?: string;

  @IsOptional() @IsUUID()
  assignedUserId?: string;

  @IsOptional() @IsString() @MaxLength(255)
  businessOwner?: string;

  @IsOptional() @IsString() @MaxLength(255)
  technicalOwner?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  notes?: string;
}
