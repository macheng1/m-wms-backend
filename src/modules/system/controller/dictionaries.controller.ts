import { Controller, Get, Query, Post, Body, Header } from '@nestjs/common';
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
  async getOptions(@Query('type') type: string) {
    return this.dictService.getOptionsByType(type);
  }

  /** 分页查询字典列表 */
  @Get('list')
  async list(
    @Query('type') type: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.dictService.list(
      type,
      parseInt(page) || 1,
      parseInt(pageSize) || 20,
    );
  }

  @Post('save')
  async save(@Body() dto: SaveDictDto) {
    return this.dictService.save(dto);
  }

  @Post('delete')
  async delete(@Body('id') id: string) {
    return this.dictService.delete(id);
  }

  @Post('update')
  async update(@Body() dto: UpdateDictDto) {
    return this.dictService.update(dto);
  }
}
