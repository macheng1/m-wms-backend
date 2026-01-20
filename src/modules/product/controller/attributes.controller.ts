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
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttributesService } from '../service/attributes.service';
import { AttributeImportService } from '../service/attribute-import.service';
import { SaveAttributeDto } from '../entities/dto/save-attribute.dto';
import { QueryAttributeDto } from '../entities/dto/query-attribute.dto';
import { ImportAttributeDto } from '../entities/dto/import-attribute.dto';

@ApiTags('产品管理-属性管理')
@ApiBearerAuth()
@Controller('attributes')
export class AttributesController {
  constructor(
    private readonly attributesService: AttributesService,
    private readonly importService: AttributeImportService,
  ) {}

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

  /**
   * 下载导入模板
   */
  @Get('template')
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '上传属性导入 Excel 文件',
    type: ImportAttributeDto,
  })
  async importAttributes(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return await this.importService.import(file, req.user.tenantId);
  }
}
