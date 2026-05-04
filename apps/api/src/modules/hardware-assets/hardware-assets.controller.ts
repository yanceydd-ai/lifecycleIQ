import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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

  @Post('import')
  @Roles(Role.Admin, Role.Editor)
  @UseInterceptors(FileInterceptor('file'))
  async importPreview(@UploadedFile() file: Express.Multer.File) {
    const csvString = file.buffer.toString('utf-8');
    return this.service.importPreview(csvString);
  }

  @Post('import/confirm')
  @Roles(Role.Admin, Role.Editor)
  async importConfirm(
    @Body() body: { rows: Record<string, string>[] },
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.service.importConfirm(body.rows, user!.id);
  }

  @Get('export')
  @Roles(Role.Admin, Role.Editor)
  async exportCsv(@Res() res: Response) {
    const csv = await this.service.exportCsv();
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hardware-assets-${date}.csv"`);
    res.send(csv);
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
