// src/modules/attributes/entities/attribute.entity.ts
import { TenantBaseEntity } from '@/database/base.entity';
import { Entity, Column, OneToMany } from 'typeorm';
import { AttributeOption } from './attribute-option.entity';

@Entity('attributes')
export class Attribute extends TenantBaseEntity {
  @Column({ comment: '属性显示名称，如：材质、直径' })
  name: string;

  @Column({ comment: '属性业务标识码，如：material、diameter，方便系统逻辑识别' })
  code: string;

  @Column({
    type: 'enum',
    enum: ['select', 'input', 'number'],
    default: 'select',
    comment: '输入类型：select-下拉选择, input-手工输入, number-数字录入',
  })
  type: string;

  @Column({ nullable: true, comment: '单位，如：mm, kg, 支' })
  unit: string;
  @Column({ default: 1, comment: '状态：1启用，0禁用' })
  isActive: number;
  // 关联：一个属性可以有多个可选值（仅当 type 为 select 时）
  @OneToMany(() => AttributeOption, (option) => option.attribute, {
    cascade: true, // 必须开启级联保存
    // 它明确告诉 TypeORM：当选项从数组中移除时，直接从数据库删除记录，而不是尝试置空外键
    orphanedRowAction: 'delete',
  })
  options: AttributeOption[];
}
