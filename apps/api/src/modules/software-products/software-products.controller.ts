import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSoftwareProductDto } from './dto/create-software-product.dto';
import { UpdateSoftwareProductDto } from './dto/update-software-product.dto';
import { SoftwareProductsService } from './software-products.service';

@Controller('software-products')
export class SoftwareProductsController {
  constructor(private service: SoftwareProductsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.findAll({ status: status as any, departmentId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateSoftwareProductDto, @CurrentUser() user: AuthUser | undefined) {
    return this.service.create(dto, user!.id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSoftwareProductDto,
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
