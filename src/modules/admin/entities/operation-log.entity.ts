import { BaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('operation_logs')
@Index(['tenantId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class OperationLog extends BaseEntity {
  @Column({ type: 'char', length: 36, nullable: true, comment: '租户ID，平台操作为空' })
  tenantId: string | null;

  @Column({ type: 'char', length: 36, nullable: true, comment: '操作人ID' })
  userId: string | null;

  @Column({ nullable: true, comment: '操作人账号' })
  username: string | null;

  @Column({ type: 'enum', enum: ['platform', 'tenant'], comment: '操作域' })
  scope: 'platform' | 'tenant';

  @Column({ comment: '业务模块' })
  module: string;

  @Column({ comment: '操作动作' })
  action: string;

  @Column({ nullable: true, comment: '目标类型' })
  targetType: string | null;

  @Column({ nullable: true, comment: '目标ID' })
  targetId: string | null;

  @Column({ type: 'text', nullable: true, comment: '操作描述' })
  description: string | null;

  @Column({ type: 'json', nullable: true, comment: '操作前数据' })
  beforeData: Record<string, any> | null;

  @Column({ type: 'json', nullable: true, comment: '操作后数据' })
  afterData: Record<string, any> | null;

  @Column({ nullable: true, comment: 'IP地址' })
  ip: string | null;
}
