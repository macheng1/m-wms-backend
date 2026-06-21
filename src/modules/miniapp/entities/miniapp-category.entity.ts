import { BaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('miniapp_categories')
@Index('IDX_miniapp_category_sort', ['sortOrder'])
@Index('IDX_miniapp_category_code', ['code'], { unique: true })
export class MiniappCategory extends BaseEntity {
  @Column({ length: 80, comment: '分类名称' })
  name: string;

  @Column({ length: 80, comment: '分类编码' })
  code: string;

  @Column({ type: 'text', nullable: true, comment: '分类图标 URL' })
  iconUrl: string | null;

  @Column({ type: 'text', nullable: true, comment: '点击跳转 URL' })
  linkUrl: string | null;

  @Column({ length: 200, nullable: true, comment: '分类说明' })
  description: string | null;

  @Column({ type: 'json', nullable: true, comment: '发布字段模板 JSON' })
  templateFields: any[] | null;

  @Column({ type: 'int', default: 0, comment: '排序，越小越靠前' })
  sortOrder: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1启用，0禁用' })
  isActive: number;
}
