import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantController } from './tenant.controller';
import { Tenant } from './entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantModule {}
