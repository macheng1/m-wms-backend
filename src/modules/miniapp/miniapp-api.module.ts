import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniappApiController } from './miniapp-api.controller';
import { MiniappBanner } from './entities/miniapp-banner.entity';
import { MiniappCategory } from './entities/miniapp-category.entity';
import { MiniappMember } from './entities/miniapp-member.entity';
import { MiniappPost } from './entities/miniapp-post.entity';
import { MiniappPostCollection } from './entities/miniapp-post-collection.entity';
import { MiniappBannerService } from './miniapp-banner.service';
import { MiniappCategoryService } from './miniapp-category.service';
import { MiniappPostService } from './miniapp-post.service';
import { MiniappService } from './miniapp.service';
import { TenantModule } from '../tenant/tenant.module';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Product } from '../product/product.entity';
import { MiniappYellowPageService } from './miniapp-yellow-page.service';

@Module({
  imports: [
    TenantModule,
    TypeOrmModule.forFeature([
      MiniappMember,
      MiniappCategory,
      MiniappPost,
      MiniappPostCollection,
      MiniappBanner,
      Tenant,
      Product,
    ]),
  ],
  controllers: [MiniappApiController],
  providers: [
    MiniappService,
    MiniappCategoryService,
    MiniappPostService,
    MiniappBannerService,
    MiniappYellowPageService,
  ],
  exports: [MiniappService],
})
export class MiniappApiModule {}
