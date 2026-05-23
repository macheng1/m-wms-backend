import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PostsService } from '../service/posts.service';
import { QueryPostDto, SavePostDto } from '../entities/dto/post.dto';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('page')
  page(@Query() query: QueryPostDto, @Req() req) {
    return this.postsService.page(query, req.user);
  }

  @Get('options')
  options(@Req() req) {
    return this.postsService.options(req.user);
  }

  @Post('save')
  save(@Body() dto: SavePostDto, @Req() req) {
    return this.postsService.save(dto, req.user);
  }

  @Post('delete')
  delete(@Body('id') id: string, @Req() req) {
    return this.postsService.delete(id, req.user);
  }
}
