import { BaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('miniapp_post_views')
@Index('IDX_miniapp_post_view_post_created', ['postId', 'createdAt'])
@Index('IDX_miniapp_post_view_member_created', ['memberId', 'createdAt'])
export class MiniappPostView extends BaseEntity {
  @Column({ length: 36, comment: '信息ID' })
  postId: string;

  @Column({ length: 36, nullable: true, comment: '浏览会员ID' })
  memberId: string | null;

  @Column({ length: 80, nullable: true, comment: '浏览IP' })
  ip: string | null;

  @Column({ type: 'text', nullable: true, comment: '浏览客户端 UA' })
  userAgent: string | null;
}
