import { IsEnum, IsString, MinLength } from 'class-validator';
import { RecommendedAction } from '@prisma/client';

export class UpdateRecommendationDto {
  @IsEnum(RecommendedAction)
  newAction: RecommendedAction;

  @IsString()
  @MinLength(10)
  rationale: string;
}
