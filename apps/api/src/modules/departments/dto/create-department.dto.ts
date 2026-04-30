import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  budgetCode?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
