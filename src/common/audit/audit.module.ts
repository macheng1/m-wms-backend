import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationLog } from '@/modules/admin/entities/operation-log.entity';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OperationLog])],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
