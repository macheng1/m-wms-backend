import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniappApiController } from './miniapp-api.controller';
import { MiniappBanner } from './entities/miniapp-banner.entity';
import { MiniappCategory } from './entities/miniapp-category.entity';
import { MiniappMember } from './entities/miniapp-member.entity';
import { MiniappPost } from './entities/miniapp-post.entity';
import { MiniappBannerService } from './miniapp-banner.service';
import { MiniappCategoryService } from './miniapp-category.service';
import { MiniappPostService } from './miniapp-post.service';
import { MiniappService } from './miniapp.service';

@Module({
  imports: [TypeOrmModule.forFeature([MiniappMember, MiniappCategory, MiniappPost, MiniappBanner])],
  controllers: [MiniappApiController],
  providers: [MiniappService, MiniappCategoryService, MiniappPostService, MiniappBannerService],
  exports: [MiniappService],
})
export class MiniappApiModule {}
