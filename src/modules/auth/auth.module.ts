import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';
import { SystemSeedService } from './entities/system-init.service';
import { Tenant } from '../tenant/entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Tenant])],
  controllers: [AuthController],
  providers: [AuthService, SystemSeedService],
  exports: [AuthService],
})
export class AuthModule {}
