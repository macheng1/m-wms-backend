import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Header,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { BusinessException } from '@/common/filters/business.exception';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { QueryProductDto } from './entities/dto/query-product.dto';
import { PublicProductDetailDto, PublicProductPageDto } from './entities/dto/public-product.dto';
import { SaveProductDto } from './entities/dto/save-product.dto';
import { ImportProductDto } from './entities/dto/import-product.dto';
import { ProductsService } from './product.service';
import { ProductImportService } from './service/product-import.service';
import { Public } from '@/common/decorators/public.decorator';
import { memoryStorageConfig } from '@/common/config/multer.config';
import { AuditLogService } from '@/common/audit/audit-log.service';

@ApiTags('产品管理-产品管理')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly importService: ProductImportService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('select')
  @ApiOperation({ summary: '获取产品下拉选择列表' })
  async selectList(@Query('keyword') keyword?: string, @Req() req?: any) {
    // 兼容两种方式获取 tenantId
    const tenantId = req?.user?.tenantId || req?.user?.tenantId;
    return this.productsService.selectList(tenantId, keyword);
  }

  @Post('save')
  @ApiOperation({ summary: '保存产品' })
  async save(@Body() dto: SaveProductDto, @Req() req) {
    return this.productsService.save(dto, req.user.tenantId);
  }

  @Post('update')
  @ApiOperation({ summary: '更新产品' })
  async update(@Body() dto: SaveProductDto, @Req() req) {
    return this.productsService.update(dto, req.user.tenantId);
  }

  @Get('page')
  @ApiOperation({ summary: '分页查询产品列表' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findPage(@Query() query: QueryProductDto, @Req() req) {
    return this.productsService.findPage(query, req.user.tenantId);
  }

  @Get('detail')
  @ApiOperation({ summary: '查询产品详情' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getDetail(@Query('id') id: string, @Req() req) {
    return this.productsService.getDetail(id, req.user.tenantId);
  }

  /**
   * 第三方调用 - 产品列表（公开）
   */
  @Post('public/page')
  @ApiOperation({ summary: '公开产品列表' })
  @Public()
  async publicFindPage(@Body() body: PublicProductPageDto, @Req() req) {
    const { tenantId, ...query } = body;
    if (!tenantId) {
      throw new BusinessException('租户ID不能为空');
    }
    const result = await this.productsService.findPublicPage(query as QueryProductDto, tenantId);
    await this.auditLogService.record({
      tenantId,
      scope: 'tenant',
      module: 'open-api',
      action: 'product.public.page',
      targetType: 'tenant',
      targetId: tenantId,
      description: '第三方调用产品公开列表',
      ip: this.auditLogService.fromRequest(req).ip,
    });
    return result;
  }

  /**
   * 第三方调用 - 产品详情（公开）
   */
  @Post('public/detail')
  @ApiOperation({ summary: '公开产品详情' })
  @Public()
  async publicGetDetail(@Body() body: PublicProductDetailDto, @Req() req) {
    const { id, tenantId } = body;
    if (!id || !tenantId) {
      throw new BusinessException('产品ID和租户ID不能为空');
    }
    const result = await this.productsService.getPublicDetail(id, tenantId);
    await this.auditLogService.record({
      tenantId,
      scope: 'tenant',
      module: 'open-api',
      action: 'product.public.detail',
      targetType: 'product',
      targetId: id,
      description: '第三方调用产品公开详情',
      ip: this.auditLogService.fromRequest(req).ip,
    });
    return result;
  }
  /** 修改产品状态 */
  @Post('status')
  @ApiOperation({ summary: '切换产品状态' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id', 'isActive'],
      properties: {
        id: { type: 'string', description: '产品ID' },
        isActive: { type: 'number', description: '状态：1启用，0禁用' },
      },
    },
  })
  async updateStatus(@Body() body: { id: string; isActive: number }, @Req() req) {
    return this.productsService.updateStatus(body.id, body.isActive, req.user.tenantId);
  }

  /** 删除产品 */
  @Post('delete')
  @ApiOperation({ summary: '删除产品' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: '产品ID' } },
    },
  })
  async delete(@Body('id') id: string, @Req() req) {
    return this.productsService.delete(id, req.user.tenantId);
  }

  /**
   * 下载导入模板
   * @param categoryCode 类目编码，提供则下载仅包含该类目的通用模板
   */
  @Get('template')
  @ApiOperation({ summary: '下载产品导入模板' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async downloadTemplate(@Query('categoryCode') categoryCode: string, @Req() req, @Res() res) {
    const buffer = await this.importService.generateTemplate(categoryCode, req.user.tenantId);
    const filename = categoryCode
      ? `product-template-${categoryCode}.xlsx`
      : 'product-import-template.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.end(buffer);
  }

  /**
   * 导入产品数据
   */
  @Post('import')
  @ApiOperation({ summary: '导入产品数据' })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorageConfig }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '上传产品导入 Excel 文件',
    type: ImportProductDto,
  })
  async importProducts(@UploadedFile() file: Express.Multer.File, @Req() req) {
    return await this.importService.import(file, req.user.tenantId);
  }
}
