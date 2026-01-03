// src/modules/product/entities/category.entity.ts

import { TenantBaseEntity } from '@/database/base.entity';
import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { Attribute } from './attribute.entity';

@Entity('categories')
export class Category extends TenantBaseEntity {
  @Column()
  name: string; // 如：引出棒、绝缘件、包装箱

  @Column({ unique: true })
  code: string;
  @Column({ default: 1, comment: '状态：1启用，0禁用' })
  isActive: number;
  /**
   * 核心：类目绑定的属性列表
   * 通过这张中间表，产品才知道自己该有哪些 specs
   */
  @ManyToMany(() => Attribute)
  @JoinTable({ name: 'category_attributes' }) // 自动创建中间表
  attributes: Attribute[];
}
