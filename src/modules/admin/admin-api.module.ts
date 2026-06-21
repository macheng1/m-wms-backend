import { Module } from '@nestjs/common';
import { AdminApiController } from './admin-api.controller';
import { TenantModule } from '../tenant/tenant.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from '../auth/entities/menu.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { OperationLog } from './entities/operation-log.entity';
import { AdminPlatformService } from './admin-platform.service';
import { Department } from '../system/entities/department.entity';
import { Post } from '../system/entities/post.entity';
import { MailModule } from '../mail/mail.module';
import { ProductModule } from '../product/product.module';
import { UnitModule } from '../unit/unit.module';

@Module({
  imports: [
    TenantModule,
    MailModule,
    ProductModule,
    UnitModule,
    TypeOrmModule.forFeature([Menu, Role, User, Tenant, Department, Post, OperationLog]),
  ],
  controllers: [AdminApiController],
  providers: [AdminPlatformService],
})
export class AdminApiModule {}
