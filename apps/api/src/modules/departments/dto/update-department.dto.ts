import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  budgetCode?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
