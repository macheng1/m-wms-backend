import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from '@/modules/admin/entities/operation-log.entity';

export interface AuditLogInput {
  tenantId?: string | null;
  userId?: string | null;
  username?: string | null;
  scope?: 'platform' | 'tenant';
  module: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  description?: string | null;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  ip?: string | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(OperationLog)
    private readonly operationLogRepo: Repository<OperationLog>,
  ) {}

  async record(input: AuditLogInput): Promise<void> {
    try {
      await this.operationLogRepo.save(
        this.operationLogRepo.create({
          tenantId: input.tenantId || null,
          userId: input.userId || null,
          username: input.username || null,
          scope: input.scope || (input.tenantId ? 'tenant' : 'platform'),
          module: input.module,
          action: input.action,
          targetType: input.targetType || null,
          targetId: input.targetId || null,
          description: input.description || null,
          beforeData: input.beforeData || null,
          afterData: input.afterData || null,
          ip: input.ip || null,
        }),
      );
    } catch (error) {
      this.logger.warn(`记录审计日志失败：${error.message}`);
    }
  }

  fromRequest(request: any) {
    return {
      tenantId: request.user?.tenantId || null,
      userId: request.user?.userId || request.user?.sub || request.user?.memberId || null,
      username: request.user?.username || null,
      scope: request.user?.userType === 'platform' ? 'platform' : 'tenant',
      ip: this.getClientIp(request),
    } as const;
  }

  private getClientIp(request: any) {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || '');
    return ip.split(',')[0].trim() || request.ip || request.socket?.remoteAddress || null;
  }
}
