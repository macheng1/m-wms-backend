import { Body, Controller, Get, Header, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SaveDictDto, UpdateDictDto } from '../entities/dto/dict.dto';
import { DictionariesService } from '../service/dictionaries.service';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('系统管理-字典管理')
@ApiBearerAuth()
@Controller('dicts')
export class DictionariesController {
  constructor(private readonly dictService: DictionariesService) {}

  /** 前端 Select 组件调用此接口 */
  @Get('options')
  @Public()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '查询字典选项' })
  async getOptions(@Query('type') type: string, @Query('tenantId') tenantId?: string) {
    return this.dictService.getOptionsByType(type, tenantId);
  }

  /** 分页查询字典列表 */
  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '分页查询字典列表' })
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
  @ApiOperation({ summary: '保存字典' })
  async save(@Body() dto: SaveDictDto, @Req() req) {
    return this.dictService.save(dto, req.user);
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '删除字典' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: '字典ID' } },
    },
  })
  async delete(@Body('id') id: string, @Req() req) {
    return this.dictService.delete(id, req.user);
  }

  @Post('update')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '更新字典' })
  async update(@Body() dto: UpdateDictDto, @Req() req) {
    return this.dictService.update(dto, req.user);
  }

  @Get('types')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '查询字典类型列表' })
  async types(@Req() req) {
    return this.dictService.types(req.user);
  }
}
