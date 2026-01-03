import { TenantBaseEntity } from '@/database/base.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Category } from './entities/category.entity';

// src/modules/product/entities/product.entity.ts
@Entity('products')
export class Product extends TenantBaseEntity {
  @Column({ comment: '产品名称' })
  name: string;

  @Column({ unique: true, comment: '产品编码/SKU' })
  code: string;

  @Column({ comment: '类目ID' })
  categoryId: string;
  /**
   * 产品图列表 (JSON 数组)
   * 存储结构：["http://oss.../img1.jpg", "http://oss.../img2.jpg"]
   * MySQL 环境下使用 type: 'json'
   */
  @Column({
    type: 'json',
    nullable: true,
    comment: '产品图片列表',
  })
  images: string[];
  @Column({ nullable: true, comment: '单位，如：支、kg' })
  unit: string;

  /**
   * 存储结构：{ "ATTR_CZ_7A2B": "304", "ATTR_ZJ_91E0": "1.5" }
   * Key 为属性编码，Value 为具体的规格值
   */
  @Column({
    type: 'json', // MySQL 不支持 jsonb，必须改为 json
    nullable: true,
    comment: '动态规格详情',
  })
  specs: Record<string, any>;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '安全库存' })
  safetyStock: number;

  @Column({ default: 1, comment: '状态：1启用，0禁用' })
  isActive: number;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
