import { IsNumber, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateScenarioDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  escalationRate: number;
}
