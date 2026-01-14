import { Controller, Get, Post, Body, Query, Req, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AttributesService } from '../service/attributes.service';
import { SaveAttributeDto } from '../entities/dto/save-attribute.dto';
import { QueryAttributeDto } from '../entities/dto/query-attribute.dto';

@ApiTags('产品管理-属性管理')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Get('page')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findPage(@Query() query: QueryAttributeDto, @Req() req) {
    return this.attributesService.findPage(query, req.user.tenantId);
  }

  @Post('save')
  async save(@Body() dto: SaveAttributeDto, @Req() req) {
    return this.attributesService.save(dto, req.user.tenantId);
  }

  /**
   * 更新属性接口
   * 路径规范: POST /attributes/update
   * 注意：实际调用 save 方法，通过 dto.id 判断是新增还是更新
   */
  @Post('update')
  async update(@Body() dto: SaveAttributeDto, @Req() req) {
    // 统一使用 save 方法，通过 dto.id 自动判断是新增还是更新
    return this.attributesService.update(dto, req.user.tenantId);
  }

  @Get('detail')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getDetail(@Query('id') id: string, @Req() req) {
    return this.attributesService.getDetail(id, req.user.tenantId);
  }

  @Post('delete')
  async delete(@Body('id') id: string, @Req() req) {
    return this.attributesService.delete(id, req.user.tenantId);
  }

  @Post('status')
  async updateStatus(@Body() body: { id: string; isActive: number }, @Req() req) {
    return this.attributesService.updateStatus(body.id, body.isActive, req.user.tenantId);
  }
}
