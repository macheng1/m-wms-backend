import { Module } from '@nestjs/common';
import { AdminApiController } from './admin-api.controller';
import { TenantModule } from '../tenant/tenant.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../auth/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { OperationLog } from './entities/operation-log.entity';
import { AdminPlatformService } from './admin-platform.service';

@Module({
  imports: [TenantModule, TypeOrmModule.forFeature([Permission, Role, User, Tenant, OperationLog])],
  controllers: [AdminApiController],
  providers: [AdminPlatformService],
})
export class AdminApiModule {}
