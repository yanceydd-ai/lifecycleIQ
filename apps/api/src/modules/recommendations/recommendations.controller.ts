import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RecommendationsService } from './recommendations.service';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private service: RecommendationsService) {}

  @Get()
  getAll(
    @Query('entityType') entityType?: string,
    @Query('minScore') minScore?: string,
  ) {
    const min = minScore ? parseInt(minScore, 10) : undefined;
    return this.service.getRecommendations({
      entityType,
      minScore: min !== undefined && !isNaN(min) ? min : undefined,
    });
  }

  @Get('history/:entityType/:id')
  getHistory(
    @Param('entityType') entityType: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getDecisionHistory(entityType, id);
  }

  @Get(':entityType/:id')
  getOne(
    @Param('entityType') entityType: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getRecommendation(entityType, id);
  }

  @Post(':entityType/:id/override')
  @Roles(Role.Admin, Role.Editor)
  override(
    @Param('entityType') entityType: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecommendationDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.service.override(entityType, id, dto, user!.id);
  }
}
