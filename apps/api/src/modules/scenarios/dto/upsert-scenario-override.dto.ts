import { IsIn, IsString, MinLength } from 'class-validator';

export class UpsertScenarioOverrideDto {
  @IsIn(['hardware_asset', 'software_product', 'contract'])
  entityType: string;

  @IsString()
  @MinLength(1)
  entityId: string;

  @IsIn(['defer_year', 'cost', 'exclude'])
  overrideType: string;

  @IsString()
  @MinLength(1)
  value: string;
}
