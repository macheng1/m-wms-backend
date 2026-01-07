import { Controller, Get, Query, Post, Body, Req, Header } from '@nestjs/common';
import { SaveDictDto, UpdateDictDto } from '../entities/dto/dict.dto';
import { DictionariesService } from '../service/dictionaries.service';
import { Public } from '@/common/decorators/public.decorator';

@Controller('dicts')
@Public()
export class DictionariesController {
  constructor(private readonly dictService: DictionariesService) {}

  /** 前端 Select 组件调用此接口 */
  @Get('options')
  @Header('Cache-Control', 'no-store')
  async getOptions(@Query('type') type: string, @Req() req) {
    return this.dictService.getOptionsByType(type, req.user?.tenantId);
  }

  @Post('save')
  async save(@Body() dto: SaveDictDto, @Req() req) {
    return this.dictService.save(dto, req.user?.tenantId);
  }

  @Post('delete')
  async delete(@Body('id') id: string, @Req() req) {
    return this.dictService.delete(id, req.user?.tenantId);
  }
  @Post('update')
  async update(@Body() dto: UpdateDictDto, @Req() req) {
    return this.dictService.update(dto, req.user?.tenantId);
  }
}
