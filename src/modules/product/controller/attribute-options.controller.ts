import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { UseGuards, Controller, Get, Query, Req, Post, Body, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryOptionDto } from '../entities/dto/query-option.dto';
import { SaveOptionDto } from '../entities/dto/save-option.dto';
import { OptionsService } from '../service/attributes-option.service';

// src/modules/attributes/options.controller.ts
@ApiTags('产品管理-规格值管理')
@UseGuards(JwtAuthGuard)
@Controller('options')
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Get('page')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findPage(@Query() query: QueryOptionDto, @Req() req) {
    return this.optionsService.findPage(query, req.user.tenantId);
  }

  @Post('save')
  async save(@Body() dto: SaveOptionDto, @Req() req) {
    return this.optionsService.save(dto, req.user.tenantId);
  }

  @Post('update')
  async update(@Body() dto: SaveOptionDto, @Req() req) {
    // 动作驱动：Update 逻辑与 Save 类似，但 DTO 里带了 ID
    return this.optionsService.update(dto, req.user.tenantId);
  }
  @Get('detail')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getDetail(@Query('id') id: string, @Req() req) {
    return this.optionsService.getDetail(id, req.user.tenantId);
  }
  @Post('delete')
  async delete(@Body('id') id: string, @Req() req) {
    return this.optionsService.delete(id);
  }

  /** 更改规格状态（启用/禁用） */
  @Post('status')
  async updateStatus(@Body() body: { id: string; isActive: number }, @Req() req) {
    return this.optionsService.updateStatus(body.id, body.isActive, req.user.tenantId);
  }
}
