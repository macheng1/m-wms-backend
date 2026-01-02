// src/modules/attributes/entities/attribute-option.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Attribute } from './attribute.entity';
import { TenantBaseEntity } from '@/database/base.entity';

@Entity('attribute_options')
export class AttributeOption extends TenantBaseEntity {
  @Column()
  attributeId: string;

  @Column({ comment: '具体选项值，如：304、12.5' })
  value: string;
  @Column({ type: 'tinyint', default: 1, comment: '属性状态：1 启用，0 禁用' })
  isActive: number; // <--- 状态字段 1启用 0禁用
  @Column({ default: 0, comment: '排序，用于前端下拉框展示顺序' })
  sort: number;

  @ManyToOne(() => Attribute, (attr) => attr.options, {
    onDelete: 'CASCADE', // 当属性删除时，级联删除选项
  })
  @JoinColumn({ name: 'attributeId' })
  attribute: Attribute;
}
