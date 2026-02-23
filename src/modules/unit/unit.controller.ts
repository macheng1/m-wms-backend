import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UnitService } from './unit.service';
import { CreateUnitDto, UpdateUnitDto, QueryUnitDto, DetailUnitDto, DeleteUnitDto } from './dto';
import { TenantId } from '@common/decorators';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('单位管理')
@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post('save')
  @ApiOperation({ summary: '创建单位' })
  create(@Body() createUnitDto: CreateUnitDto, @TenantId() tenantId: string) {
    return this.unitService.create(createUnitDto, tenantId);
  }

  @Post('update')
  @ApiOperation({ summary: '更新单位' })
  update(@Body() updateUnitDto: UpdateUnitDto, @TenantId() tenantId: string) {
    return this.unitService.update(updateUnitDto.id, updateUnitDto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: '获取单位列表' })
  findAll(@Query() query: QueryUnitDto, @TenantId() tenantId: string) {
    return this.unitService.findAll(query, tenantId);
  }

  @Get('active')
  @ApiOperation({ summary: '获取启用的单位列表' })
  findActive(@TenantId() tenantId: string) {
    return this.unitService.findActive(tenantId);
  }

  @Get('page')
  @ApiOperation({ summary: '分页获取单位列表' })
  findPage(@Query() query: QueryUnitDto, @TenantId() tenantId: string) {
    return this.unitService.findPage(query, tenantId);
  }

  @Post('detail')
  @ApiOperation({ summary: '获取单位详情' })
  findOne(@Body() dto: DetailUnitDto, @TenantId() tenantId: string) {
    if (dto.id) {
      return this.unitService.findOne(dto.id, tenantId);
    }
    if (dto.code) {
      return this.unitService.findByCode(dto.code, tenantId);
    }
  }

  @Post('delete')
  @ApiOperation({ summary: '删除单位' })
  remove(@Body() dto: DeleteUnitDto, @TenantId() tenantId: string) {
    return this.unitService.remove(dto.id, tenantId);
  }
}
