import { Controller, Post, Body, Get, Query, Req, Header } from '@nestjs/common';
import { QueryProductDto } from './entities/dto/query-product.dto';
import { SaveProductDto } from './entities/dto/save-product.dto';
import { ProductsService } from './product.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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
}
