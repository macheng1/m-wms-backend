import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantController } from './tenant.controller';
import { Tenant } from './entities/tenant.entity';
import { UnitModule } from '../unit/unit.module';
import { User } from '../users/entities/user.entity';
import { Menu } from '../auth/entities/menu.entity';
import { Role } from '../roles/entities/role.entity';
import { Unit } from '../unit/entities/unit.entity';
import { Category } from '../product/entities/category.entity';
import { Attribute } from '../product/entities/attribute.entity';
import { OpenApiSignatureGuard } from '@/common/guards/open-api-signature.guard';

@Module({
  imports: [
    UnitModule,
    TypeOrmModule.forFeature([Tenant, User, Menu, Role, Unit, Category, Attribute]),
  ],
  controllers: [TenantController],
  providers: [TenantsService, OpenApiSignatureGuard],
  exports: [TenantsService],
})
export class TenantModule {}
