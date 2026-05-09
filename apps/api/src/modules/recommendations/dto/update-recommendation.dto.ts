import { IsEnum, IsString, MinLength } from 'class-validator';
import { RecommendedAction } from '@prisma/client';

export class UpdateRecommendationDto {
  @IsEnum(RecommendedAction)
  newAction: string;

  @IsString()
  @MinLength(10)
  rationale: string;
}
