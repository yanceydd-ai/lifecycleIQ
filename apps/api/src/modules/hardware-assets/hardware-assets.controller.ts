import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateHardwareAssetDto } from './dto/create-hardware-asset.dto';
import { UpdateHardwareAssetDto } from './dto/update-hardware-asset.dto';
import { HardwareAssetsService } from './hardware-assets.service';

@Controller('hardware-assets')
export class HardwareAssetsController {
  constructor(private service: HardwareAssetsService) {}

  @Get()
  findAll(
    @Query('lifecycleStatus') lifecycleStatus?: string,
    @Query('assetType') assetType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.service.findAll({ lifecycleStatus, assetType, departmentId, locationId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateHardwareAssetDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.create(dto, user!.id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHardwareAssetDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.service.update(id, dto, user!.id);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | undefined) {
    return this.service.remove(id, user!.id);
  }
}
