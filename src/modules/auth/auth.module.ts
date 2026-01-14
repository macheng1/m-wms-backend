import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SystemSeedService } from './entities/system-init.service';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Permission } from './entities/permission.entity';
import { Dictionary } from '../system/entities/dictionary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Tenant, Permission, Dictionary])],
  controllers: [AuthController],
  providers: [AuthService, SystemSeedService],
  exports: [AuthService],
})
export class AuthModule {}
