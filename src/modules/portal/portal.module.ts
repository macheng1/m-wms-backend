// src/modules/portal/portal.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';

// 导入相关实体

import { Category } from '../product/entities/category.entity';

import { PortalConfig } from './entities/portal-config.entity';
import { Inquiry } from './entities/inquiry.entity';
import { Product } from '../product/product.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { AdminPortalController } from './admin-portal.controller';

@Module({
  imports: [
    // 💡 注册所有需要在 PortalService 中注入的 Repository
    TypeOrmModule.forFeature([Tenant, PortalConfig, Inquiry, Category, Product]),
  ],
  // 💡 注册两套控制器：一套面向官网，一套面向管理后台
  controllers: [PortalController, AdminPortalController],
  // 💡 提供业务逻辑服务
  providers: [PortalService],
  // 如果其他模块（如 CRM 模块）需要读取询盘信息，可以将 Service 导出
  exports: [PortalService],
})
export class PortalModule {}
