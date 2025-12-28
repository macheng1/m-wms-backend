// src/modules/tenants/entities/tenant.entity.ts
import { BaseEntity } from '@/database/base.entity';
import { Entity, Column } from 'typeorm';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ unique: true, comment: '工厂/租户名称' })
  name: string;

  @Column({ default: 'heating_element', comment: '所属行业' })
  industry: string;

  @Column({ default: true, comment: '账号是否激活' })
  isActive: boolean;
}
