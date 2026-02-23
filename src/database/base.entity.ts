// src/common/database/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '最后更新时间' })
  updatedAt: Date;

  @DeleteDateColumn({ comment: '删除时间（伪删除标记）' })
  deletedAt: Date;
}
// 专门为 SaaS 业务设计的带租户标识的基类
import { Column } from 'typeorm';

export abstract class TenantBaseEntity extends BaseEntity {
  @Column({ type: 'char', length: 36, nullable: true, comment: '租户ID，如果是平台管理员则为空' })
  tenantId: string | null;
}
