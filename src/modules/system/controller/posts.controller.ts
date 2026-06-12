import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PostsService } from '../service/posts.service';
import { QueryPostDto, SavePostDto } from '../entities/dto/post.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('系统管理-岗位管理')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('page')
  @ApiOperation({ summary: '分页查询岗位列表' })
  page(@Query() query: QueryPostDto, @Req() req) {
    return this.postsService.page(query, req.user);
  }

  @Get('options')
  @ApiOperation({ summary: '查询岗位下拉选项' })
  options(@Req() req) {
    return this.postsService.options(req.user);
  }

  @Post('save')
  @ApiOperation({ summary: '保存岗位' })
  save(@Body() dto: SavePostDto, @Req() req) {
    return this.postsService.save(dto, req.user);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除岗位' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: '岗位ID' } },
    },
  })
  delete(@Body('id') id: string, @Req() req) {
    return this.postsService.delete(id, req.user);
  }
}
