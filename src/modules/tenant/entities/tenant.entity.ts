// src/modules/tenants/entities/tenant.entity.ts
import { BaseEntity } from '@/database/base.entity';
import { Entity, Column, Index } from 'typeorm';

@Entity('tenants')
export class Tenant extends BaseEntity {
  /**
   * 核心字段：企业编码
   * 用于登录时的租户识别，必须唯一，且建议加上索引提高查询效率
   */
  @Index({ unique: true })
  @Column({ length: 50, comment: '企业唯一编码（用于登录/识别）' })
  code: string;

  @Column({ unique: true, comment: '工厂/租户全称' })
  name: string;

  @Column({ default: 'heating_element', comment: '所属行业' })
  industry: string;

  /**
   * 业务字段：联系信息
   * 这些字段虽然不是登录必须，但在 WMS 业务单据（如送货单）中非常重要
   */
  @Column({ nullable: true, comment: '联系人' })
  contactPerson: string;

  @Column({ nullable: true, comment: '联系电话' })
  contactPhone: string;

  @Column({ nullable: true, type: 'text', comment: '工厂详细地址' })
  address: string;

  @Column({ default: true, comment: '租户状态：是否激活' })
  isActive: boolean;
}
