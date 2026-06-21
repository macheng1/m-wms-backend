import { BaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('miniapp_post_collections')
@Index('IDX_miniapp_post_collection_unique', ['memberId', 'postId'], { unique: true })
export class MiniappPostCollection extends BaseEntity {
  @Column({ length: 36, comment: '会员ID' })
  memberId: string;

  @Column({ length: 36, comment: '信息ID' })
  postId: string;
}
