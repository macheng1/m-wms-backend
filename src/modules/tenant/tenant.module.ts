import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantController } from './tenant.controller';
import { Tenant } from './entities/tenant.entity';
import { SystemModule } from '../system/system.module';
import { UnitModule } from '../unit/unit.module';
import { SystemSeedService } from '../auth/entities/system-init.service';
import { User } from '../users/entities/user.entity';
import { Permission } from '../auth/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { Unit } from '../unit/entities/unit.entity';
import { Category } from '../product/entities/category.entity';
import { Attribute } from '../product/entities/attribute.entity';
import { Dictionary } from '../system/entities/dictionary.entity';

@Module({
  imports: [
    SystemModule,
    UnitModule,
    TypeOrmModule.forFeature([
      Tenant,
      User,
      Permission,
      Role,
      Unit,
      Category,
      Attribute,
      Dictionary,
    ]),
  ],
  controllers: [TenantController],
  providers: [TenantsService, SystemSeedService],
  exports: [TenantsService],
})
export class TenantModule {}
