import { Body, Controller, Get, Header, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SaveDictDto, UpdateDictDto } from '../entities/dto/dict.dto';
import { DictionariesService } from '../service/dictionaries.service';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('dicts')
export class DictionariesController {
  constructor(private readonly dictService: DictionariesService) {}

  /** 前端 Select 组件调用此接口 */
  @Get('options')
  @Public()
  @Header('Cache-Control', 'no-store')
  async getOptions(@Query('type') type: string, @Query('tenantId') tenantId?: string) {
    return this.dictService.getOptionsByType(type, tenantId);
  }

  /** 分页查询字典列表 */
  @Get('list')
  @UseGuards(JwtAuthGuard)
  async list(
    @Query('type') type: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('scope') scope: 'platform' | 'tenant',
    @Req() req,
  ) {
    return this.dictService.list(
      type,
      parseInt(page) || 1,
      parseInt(pageSize) || 20,
      req.user,
      scope,
    );
  }

  @Post('save')
  @UseGuards(JwtAuthGuard)
  async save(@Body() dto: SaveDictDto, @Req() req) {
    return this.dictService.save(dto, req.user);
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard)
  async delete(@Body('id') id: string, @Req() req) {
    return this.dictService.delete(id, req.user);
  }

  @Post('update')
  @UseGuards(JwtAuthGuard)
  async update(@Body() dto: UpdateDictDto, @Req() req) {
    return this.dictService.update(dto, req.user);
  }

  @Get('types')
  @UseGuards(JwtAuthGuard)
  async types(@Req() req) {
    return this.dictService.types(req.user);
  }
}
