// src/modules/system/entities/dictionary.entity.ts
import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '@/database/base.entity';

@Entity('dictionaries')
export class Dictionary extends TenantBaseEntity {
  @Column({
    type: 'enum',
    enum: ['platform', 'tenant'],
    default: 'platform',
    comment: '字典归属域：platform-平台标准字典，tenant-租户自定义字典',
  })
  scope: 'platform' | 'tenant';

  @Column({ comment: '字典类型，如 INDUSTRY, UNIT, MATERIAL' })
  type: string;

  @Column({ comment: '展示名称 (前端 label)' })
  label: string;

  @Column({ comment: '实际存值 (前端 value)' })
  value: string;

  @Column({ default: 0, comment: '排序' })
  sort: number;

  @Column({ default: 1, comment: '状态：1启用，0禁用' })
  isActive: number;

  @Column({ type: 'tinyint', default: 0, comment: '是否系统内置字典，内置字典不建议删除' })
  isSystem: number;

  @Column({ type: 'tinyint', default: 0, comment: '是否允许租户扩展' })
  allowTenantExtend: number;

  @Column({ type: 'tinyint', default: 0, comment: '是否允许租户覆盖' })
  allowTenantOverride: number;

  @Column({ type: 'char', length: 36, nullable: true, comment: '继承的平台字典ID' })
  parentId: string | null;
}
