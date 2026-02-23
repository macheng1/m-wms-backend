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

  /**
   * 逻辑关联：存储字典表中 type='INDUSTRY' 的 value
   * 对应你入驻页面上的“所属行业”选择
   */
  @Column({
    type: 'varchar',
    length: 50,
    comment: '所属行业代码',
    nullable: true,
  })
  industryCode: string;
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
  @Column({ nullable: true, type: 'text', comment: '工厂地址(别名)' })
  factoryAddress: string;

  @Column({ nullable: true, type: 'text', comment: '公司注册地址' })
  registerAddress: string;

  @Column({ nullable: true, comment: '官网' })
  website: string;

  @Column({ nullable: true, type: 'text', comment: '备注' })
  remark: string;

  // 税务信息
  @Column({ nullable: true, length: 50, comment: '税号' })
  taxNo: string;

  @Column({ nullable: true, comment: '纳税人类型' })
  taxpayerType: string;

  @Column({ nullable: true, length: 100, comment: '统一社会信用代码' })
  creditCode: string;

  // 银行信息
  @Column({ nullable: true, comment: '开户行' })
  bankName: string;

  @Column({ nullable: true, comment: '银行账号' })
  bankAccount: string;

  // 营业执照信息
  @Column({ nullable: true, length: 100, comment: '营业执照号' })
  businessLicenseNo: string;

  @Column({ nullable: true, type: 'date', comment: '营业执照有效期' })
  businessLicenseExpire: Date;

  // 法人和注册信息
  @Column({ nullable: true, comment: '法人代表' })
  legalPerson: string;

  @Column({ nullable: true, comment: '注册资本' })
  registeredCapital: string;

  @Column({ nullable: true, comment: '行业分类' })
  industryType: string;

  // 资质信息
  @Column({ nullable: true, length: 100, comment: '资质证书编号' })
  qualificationNo: string;

  @Column({ nullable: true, type: 'date', comment: '资质证书有效期' })
  qualificationExpire: Date;

  // 联系信息
  @Column({ nullable: true, comment: '联系邮箱' })
  email: string;

  @Column({ nullable: true, comment: '传真' })
  fax: string;

  // 企业基本信息
  @Column({ nullable: true, type: 'date', comment: '成立日期' })
  foundDate: Date;

  @Column({ nullable: true, type: 'int', comment: '员工人数' })
  staffCount: number;

  @Column({ nullable: true, type: 'text', comment: '主要产品' })
  mainProducts: string;

  @Column({ nullable: true, comment: '年产能' })
  annualCapacity: string;
  @Column({
    type: 'tinyint',
    default: 1,
    comment: '租户状态：是否激活 (1启用/0禁用)',
  })
  isActive: number;
}
