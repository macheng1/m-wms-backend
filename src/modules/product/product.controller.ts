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
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { QueryProductDto } from './entities/dto/query-product.dto';
import { SaveProductDto } from './entities/dto/save-product.dto';
import { ImportProductDto } from './entities/dto/import-product.dto';
import { ProductsService } from './product.service';
import { ProductImportService } from './service/product-import.service';
import { Public } from '@/common/decorators/public.decorator';
import { memoryStorageConfig } from '@/common/config/multer.config';
import multer = require('multer');

@ApiTags('产品管理-产品管理')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly importService: ProductImportService,
  ) {}

  @Get('select')
  @ApiOperation({ summary: '获取产品下拉选择列表' })
  async selectList(@Query('keyword') keyword?: string, @Req() req?: any) {
    // 兼容两种方式获取 tenantId
    const tenantId = req?.user?.tenantId || req?.user?.tenantId;
    return this.productsService.selectList(tenantId, keyword);
  }

  @Post('save')
  async save(@Body() dto: SaveProductDto, @Req() req) {
    return this.productsService.save(dto, req.user.tenantId);
  }

  @Post('update')
  async update(@Body() dto: SaveProductDto, @Req() req) {
    return this.productsService.update(dto, req.user.tenantId);
  }

  @Get('page')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findPage(@Query() query: QueryProductDto, @Req() req) {
    return this.productsService.findPage(query, req.user.tenantId);
  }

  @Get('detail')
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
  @ApiOperation({ summary: '第三方调用 - 产品列表' })
  @Public()
  async publicFindPage(@Body() body: { tenantId: string } & Partial<QueryProductDto>) {
    const { tenantId, ...query } = body;
    if (!tenantId) {
      throw new BusinessException('租户ID不能为空');
    }
    return this.productsService.findPage(query as QueryProductDto, tenantId);
  }

  /**
   * 第三方调用 - 产品详情（公开）
   */
  @Post('public/detail')
  @ApiOperation({ summary: '第三方调用 - 产品详情' })
  @Public()
  async publicGetDetail(@Body() body: { id: string; tenantId: string }) {
    const { id, tenantId } = body;
    if (!id || !tenantId) {
      throw new BusinessException('产品ID和租户ID不能为空');
    }
    return this.productsService.getDetail(id, tenantId);
  }
  /** 修改产品状态 */
  @Post('status')
  async updateStatus(@Body() body: { id: string; isActive: number }, @Req() req) {
    return this.productsService.updateStatus(body.id, body.isActive, req.user.tenantId);
  }

  /** 删除产品 */
  @Post('delete')
  async delete(@Body('id') id: string, @Req() req) {
    return this.productsService.delete(id, req.user.tenantId);
  }

  /**
   * 下载导入模板
   * @param categoryCode 类目编码，提供则下载该类目专属模板（属性展开为列）
   */
  @Get('template')
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
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorageConfig }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '上传产品导入 Excel 文件',
    type: ImportProductDto,
  })
  async importProducts(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const result = await this.importService.import(file, req.user.tenantId);

    // 如果有失败记录，抛出业务异常
    if (result.failCount > 0) {
      throw new BusinessException(
        `导入完成，成功${result.successCount}条，失败${result.failCount}条`,
        10001, // 业务错误码
        result.errors, // 错误详情
      );
    }

    return result;
  }
}
