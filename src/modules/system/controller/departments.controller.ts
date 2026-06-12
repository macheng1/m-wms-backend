import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { DepartmentsService } from '../service/departments.service';
import { QueryDepartmentDto, SaveDepartmentDto } from '../entities/dto/department.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('系统管理-部门管理')
@ApiBearerAuth()
@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get('list')
  @ApiOperation({ summary: '查询部门列表' })
  list(@Query() query: QueryDepartmentDto, @Req() req) {
    return this.departmentsService.list(query, req.user);
  }

  @Get('tree')
  @ApiOperation({ summary: '查询部门树' })
  tree(@Query() query: QueryDepartmentDto, @Req() req) {
    return this.departmentsService.tree(query, req.user);
  }

  @Get('options')
  @ApiOperation({ summary: '查询部门下拉选项' })
  options(@Req() req) {
    return this.departmentsService.options(req.user);
  }

  @Post('save')
  @ApiOperation({ summary: '保存部门' })
  save(@Body() dto: SaveDepartmentDto, @Req() req) {
    return this.departmentsService.save(dto, req.user);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除部门' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: '部门ID' } },
    },
  })
  delete(@Body('id') id: string, @Req() req) {
    return this.departmentsService.delete(id, req.user);
  }
}
