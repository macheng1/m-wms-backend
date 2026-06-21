import { TenantBaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('posts')
@Index(['tenantId', 'postCode'], { unique: true })
export class Post extends TenantBaseEntity {
  @Column({ length: 50, comment: '岗位编码' })
  postCode: string;

  @Column({ length: 100, comment: '岗位名称' })
  postName: string;

  @Column({ default: 0, comment: '显示顺序' })
  postSort: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1正常，0停用' })
  isActive: number;

  @Column({ length: 255, nullable: true, comment: '备注' })
  remark: string | null;
}
