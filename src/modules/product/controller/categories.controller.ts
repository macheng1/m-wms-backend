// src/modules/product/controller/categories.controller.ts
import { Controller, Post, Get, Body, Query, Request, Header } from '@nestjs/common';
import { CategoriesService } from '../service/categories.service';
import { SaveCategoryDto, QueryCategoryDto } from '../entities/dto/save-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('save')
  async save(@Body() dto: SaveCategoryDto, @Request() req) {
    return this.categoriesService.save(dto, req.user.tenantId);
  }

  @Get('page')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findPage(@Query() query: QueryCategoryDto, @Request() req) {
    return this.categoriesService.findPage(query, req.user.tenantId);
  }

  @Get('detail')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getDetail(@Query('id') id: string, @Request() req) {
    return this.categoriesService.getDetail(id, req.user.tenantId);
  }

  @Post('status')
  async updateStatus(@Body() body: { id: string; isActive: number }, @Request() req) {
    return this.categoriesService.updateStatus(body.id, body.isActive, req.user.tenantId);
  }
  /** * 更新类目 (补全)
   */
  @Post('update')
  async update(@Body() dto: SaveCategoryDto, @Request() req) {
    return this.categoriesService.update(dto, req.user.tenantId);
  }
  @Post('delete')
  async delete(@Body('id') id: string, @Request() req) {
    return this.categoriesService.delete(id, req.user.tenantId);
  }
}
