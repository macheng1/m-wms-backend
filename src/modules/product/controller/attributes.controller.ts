import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Header,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttributesService } from '../service/attributes.service';
import { AttributeImportService } from '../service/attribute-import.service';
import { SaveAttributeDto } from '../entities/dto/save-attribute.dto';
import { QueryAttributeDto } from '../entities/dto/query-attribute.dto';
import { ImportAttributeDto } from '../entities/dto/import-attribute.dto';
import { memoryStorageConfig } from '@/common/config/multer.config';
import multer = require('multer');

@ApiTags('产品管理-属性管理')
@ApiBearerAuth()
@Controller('attributes')
export class AttributesController {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly importService: AttributeImportService,
  ) {}

  @Get('page')
  @ApiOperation({ summary: '分页查询产品属性' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findPage(@Query() query: QueryAttributeDto, @Req() req) {
    return this.attributesService.findPage(query, req.user.tenantId);
  }

  @Post('save')
  @ApiOperation({ summary: '保存产品属性' })
  async save(@Body() dto: SaveAttributeDto, @Req() req) {
    return this.attributesService.save(dto, req.user.tenantId);
  }

  /**
   * 更新属性接口
   * 路径规范: POST /attributes/update
   * 注意：实际调用 save 方法，通过 dto.id 判断是新增还是更新
   */
  @Post('update')
  @ApiOperation({ summary: '更新产品属性' })
  async update(@Body() dto: SaveAttributeDto, @Req() req) {
    // 统一使用 save 方法，通过 dto.id 自动判断是新增还是更新
    return this.attributesService.update(dto, req.user.tenantId);
  }

  @Get('detail')
  @ApiOperation({ summary: '查询产品属性详情' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getDetail(@Query('id') id: string, @Req() req) {
    return this.attributesService.getDetail(id, req.user.tenantId);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除产品属性' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: '属性ID' } },
    },
  })
  async delete(@Body('id') id: string, @Req() req) {
    return this.attributesService.delete(id, req.user.tenantId);
  }

  @Post('batchDelete')
  @ApiOperation({ summary: '批量删除产品属性' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['ids'],
      properties: { ids: { type: 'array', items: { type: 'string' }, description: '属性ID数组' } },
    },
  })
  async batchDelete(@Body('ids') ids: string[], @Req() req) {
    return this.attributesService.batchDelete(ids, req.user.tenantId);
  }

  @Post('status')
  @ApiOperation({ summary: '切换产品属性状态' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id', 'isActive'],
      properties: {
        id: { type: 'string', description: '属性ID' },
        isActive: { type: 'number', description: '状态：1启用，0禁用' },
      },
    },
  })
  async updateStatus(@Body() body: { id: string; isActive: number }, @Req() req) {
    return this.attributesService.updateStatus(body.id, body.isActive, req.user.tenantId);
  }

  /**
   * 下载导入模板
   */
  @Get('template')
  @ApiOperation({ summary: '下载属性导入模板' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename=attribute-import-template.xlsx')
  async downloadTemplate(@Res() res) {
    const buffer = await this.importService.generateTemplate();
    res.end(buffer); // 直接输出二进制
  }
  /**
   * 导入属性数据
   */
  @Post('import')
  @ApiOperation({ summary: '导入产品属性' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorageConfig }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '上传属性导入 Excel 文件',
    type: ImportAttributeDto,
  })
  async importAttributes(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return await this.importService.import(file, req.user.tenantId);
  }
}
