import { BaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('miniapp_banners')
@Index('IDX_miniapp_banner_sort', ['sortOrder'])
export class MiniappBanner extends BaseEntity {
  @Column({ length: 100, comment: '轮播图标题' })
  title: string;

  @Column({ type: 'text', comment: '图片 URL' })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: ['none', 'page', 'webview', 'post', 'category'],
    default: 'none',
    comment: '跳转类型：none不跳转/page小程序页面/webview网页/post信息详情/category分类',
  })
  linkType: 'none' | 'page' | 'webview' | 'post' | 'category';

  @Column({ type: 'text', nullable: true, comment: '跳转地址或目标ID' })
  linkValue: string | null;

  @Column({ type: 'int', default: 0, comment: '排序，越小越靠前' })
  sortOrder: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1启用，0停用' })
  isActive: number;
}
