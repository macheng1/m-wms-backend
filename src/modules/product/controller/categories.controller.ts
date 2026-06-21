// src/modules/product/controller/categories.controller.ts
import { Controller, Post, Get, Body, Query, Request, Header } from '@nestjs/common';
import { CategoriesService } from '../service/categories.service';
import { SaveCategoryDto, QueryCategoryDto } from '../entities/dto/save-category.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('产品管理-类目管理')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('save')
  @ApiOperation({ summary: '保存产品类目' })
  async save(@Body() dto: SaveCategoryDto, @Request() req) {
    return this.categoriesService.save(dto, req.user.tenantId);
  }

  @Get('page')
  @ApiOperation({ summary: '分页查询产品类目' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findPage(@Query() query: QueryCategoryDto, @Request() req) {
    return this.categoriesService.findPage(query, req.user.tenantId);
  }

  @Get('select')
  @ApiOperation({ summary: '查询产品类目下拉选项' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async selectList(
    @Query('keyword') keyword: string,
    @Query('isActive') isActive: string,
    @Request() req,
  ) {
    const active = isActive === undefined ? undefined : Number(isActive);
    return this.categoriesService.selectList(req.user.tenantId, keyword, active);
  }

  @Get('detail')
  @ApiOperation({ summary: '查询产品类目详情' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getDetail(@Query('id') id: string, @Request() req) {
    return this.categoriesService.getDetail(id, req.user.tenantId);
  }

  @Post('status')
  @ApiOperation({ summary: '切换产品类目状态' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id', 'isActive'],
      properties: {
        id: { type: 'string', description: '类目ID' },
        isActive: { type: 'number', description: '状态：1启用，0禁用' },
      },
    },
  })
  async updateStatus(@Body() body: { id: string; isActive: number }, @Request() req) {
    return this.categoriesService.updateStatus(body.id, body.isActive, req.user.tenantId);
  }
  /** * 更新类目 (补全)
   */
  @Post('update')
  @ApiOperation({ summary: '更新产品类目' })
  async update(@Body() dto: SaveCategoryDto, @Request() req) {
    return this.categoriesService.update(dto, req.user.tenantId);
  }
  @Post('delete')
  @ApiOperation({ summary: '删除产品类目' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: '类目ID' } },
    },
  })
  async delete(@Body('id') id: string, @Request() req) {
    return this.categoriesService.delete(id, req.user.tenantId);
  }
}
