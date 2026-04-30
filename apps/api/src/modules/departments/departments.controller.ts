import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { AuthUser, Role } from '@lifecycleiq/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private deptService: DepartmentsService) {}

  @Get()
  findAll() {
    return this.deptService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deptService.findOne(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Editor)
  create(@Body() dto: CreateDepartmentDto, @CurrentUser() user: AuthUser | undefined) {
    return this.deptService.create(dto, user!.id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Editor)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.deptService.update(id, dto, user!.id);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | undefined) {
    return this.deptService.remove(id, user!.id);
  }
}
