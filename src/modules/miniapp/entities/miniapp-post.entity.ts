import { BaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('miniapp_posts')
@Index('IDX_miniapp_post_category', ['categoryId'])
@Index('IDX_miniapp_post_status_created', ['status', 'createdAt'])
export class MiniappPost extends BaseEntity {
  @Column({ length: 36, comment: '小程序分类ID' })
  categoryId: string;

  @Column({ length: 36, nullable: true, comment: '发布会员ID' })
  memberId: string | null;

  @Column({ length: 36, nullable: true, comment: '企业租户ID' })
  tenantId: string | null;

  @Column({ length: 120, nullable: true, comment: '标题' })
  title: string | null;

  @Column({ length: 30, nullable: true, comment: '联系电话' })
  phone: string | null;

  @Column({ type: 'text', comment: '发布内容' })
  content: string;

  @Column({ type: 'json', nullable: true, comment: '结构化发布字段 JSON' })
  structuredData: Record<string, any> | null;

  @Column({ length: 120, nullable: true, comment: '地区' })
  region: string | null;

  @Column({ type: 'text', nullable: true, comment: '图片/图纸 URL，逗号分隔' })
  imgList: string | null;

  @Column({ type: 'int', default: 0, comment: '浏览次数' })
  viewNum: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'published', 'rejected', 'offline'],
    default: 'pending',
    comment: '状态：pending待审核/published已发布/rejected已驳回/offline已下架',
  })
  status: 'pending' | 'published' | 'rejected' | 'offline';

  @Column({ type: 'text', nullable: true, comment: '审核/驳回原因' })
  auditRemark: string | null;

  @Column({ type: 'datetime', nullable: true, comment: '审核时间' })
  auditedAt: Date | null;
}
