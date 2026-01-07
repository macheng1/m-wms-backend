// src/modules/system/entities/dictionary.entity.ts
import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '@/database/base.entity';

@Entity('dictionaries')
export class Dictionary extends TenantBaseEntity {
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
}
