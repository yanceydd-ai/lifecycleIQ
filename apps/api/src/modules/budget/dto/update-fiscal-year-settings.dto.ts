import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateFiscalYearSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearStartMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultEscalationRate?: number;
}
