import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { DepartmentsService } from '../service/departments.service';
import { QueryDepartmentDto, SaveDepartmentDto } from '../entities/dto/department.dto';

@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get('list')
  list(@Query() query: QueryDepartmentDto, @Req() req) {
    return this.departmentsService.list(query, req.user);
  }

  @Get('tree')
  tree(@Query() query: QueryDepartmentDto, @Req() req) {
    return this.departmentsService.tree(query, req.user);
  }

  @Get('options')
  options(@Req() req) {
    return this.departmentsService.options(req.user);
  }

  @Post('save')
  save(@Body() dto: SaveDepartmentDto, @Req() req) {
    return this.departmentsService.save(dto, req.user);
  }

  @Post('delete')
  delete(@Body('id') id: string, @Req() req) {
    return this.departmentsService.delete(id, req.user);
  }
}
