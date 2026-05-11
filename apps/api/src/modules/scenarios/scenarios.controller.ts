import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ScenariosService } from './scenarios.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { UpdateScenarioDto } from './dto/update-scenario.dto';
import { UpsertScenarioOverrideDto } from './dto/upsert-scenario-override.dto';

@Controller('scenarios')
export class ScenariosController {
  constructor(private service: ScenariosService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateScenarioDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.create(dto, user!.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScenarioDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Get(':id/forecast')
  getForecast(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getForecast(id);
  }

  @Put(':id/overrides')
  @Roles(Role.Admin, Role.Editor)
  upsertOverride(
    @Param('id', ParseUUIDPipe) scenarioId: string,
    @Body() dto: UpsertScenarioOverrideDto,
  ) {
    return this.service.upsertOverride(scenarioId, dto);
  }

  @Delete(':id/overrides/:overrideId')
  @Roles(Role.Admin, Role.Editor)
  removeOverride(
    @Param('id', ParseUUIDPipe) scenarioId: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
  ) {
    return this.service.removeOverride(scenarioId, overrideId);
  }
}
