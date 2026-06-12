import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { UseGuards, Controller, Get, Query, Req, Post, Body, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueryOptionDto } from '../entities/dto/query-option.dto';
import { SaveOptionDto } from '../entities/dto/save-option.dto';
import { OptionsService } from '../service/attributes-option.service';

// src/modules/attributes/options.controller.ts
@ApiTags('产品管理-规格值管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('options')
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Get('page')
  @ApiOperation({ summary: '分页查询规格值' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findPage(@Query() query: QueryOptionDto, @Req() req) {
    return this.optionsService.findPage(query, req.user.tenantId);
  }

  @Post('save')
  @ApiOperation({ summary: '保存规格值' })
  async save(@Body() dto: SaveOptionDto, @Req() req) {
    return this.optionsService.save(dto, req.user.tenantId);
  }

  @Post('batchSave')
  @ApiOperation({ summary: '批量保存规格值' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['attributeId', 'values'],
      properties: {
        attributeId: { type: 'string', description: '属性ID' },
        values: { type: 'array', items: { type: 'string' }, description: '规格值数组' },
      },
    },
  })
  async batchSave(@Body() body: { attributeId: string; values: string[] }, @Req() req) {
    return this.optionsService.batchSave(body.attributeId, body.values, req.user.tenantId);
  }

  @Post('update')
  @ApiOperation({ summary: '更新规格值' })
  async update(@Body() dto: SaveOptionDto, @Req() req) {
    // 动作驱动：Update 逻辑与 Save 类似，但 DTO 里带了 ID
    return this.optionsService.update(dto, req.user.tenantId);
  }
  @Get('detail')
  @ApiOperation({ summary: '查询规格值详情' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getDetail(@Query('id') id: string, @Req() req) {
    return this.optionsService.getDetail(id, req.user.tenantId);
  }
  @Post('delete')
  @ApiOperation({ summary: '删除规格值' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: '规格值ID' } },
    },
  })
  async delete(@Body('id') id: string, @Req() req) {
    return this.optionsService.delete(id, req.user.tenantId);
  }

  @Post('batchDelete')
  @ApiOperation({ summary: '批量删除规格值' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids'],
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: '规格值ID数组' },
      },
    },
  })
  async batchDelete(@Body('ids') ids: string[], @Req() req) {
    return this.optionsService.batchDelete(ids, req.user.tenantId);
  }

  /** 更改规格状态（启用/禁用） */
  @Post('status')
  @ApiOperation({ summary: '切换规格值状态' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id', 'isActive'],
      properties: {
        id: { type: 'string', description: '规格值ID' },
        isActive: { type: 'number', description: '状态：1启用，0禁用' },
      },
    },
  })
  async updateStatus(@Body() body: { id: string; isActive: number }, @Req() req) {
    return this.optionsService.updateStatus(body.id, body.isActive, req.user.tenantId);
  }
}
