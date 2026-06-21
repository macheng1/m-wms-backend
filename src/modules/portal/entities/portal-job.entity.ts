import { TenantBaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('portal_jobs')
@Index(['tenantId', 'sortOrder'])
export class PortalJob extends TenantBaseEntity {
  @Column({ length: 100, comment: '招聘职位' })
  position: string;

  @Column({ type: 'int', default: 1, comment: '招聘人数' })
  count: number;

  @Column({ length: 100, nullable: true, comment: '薪资范围' })
  salary: string | null;

  @Column({ length: 100, nullable: true, comment: '工作地点' })
  location: string | null;

  @Column({ length: 100, nullable: true, comment: '经验要求' })
  experience: string | null;

  @Column({ length: 100, nullable: true, comment: '学历要求' })
  education: string | null;

  @Column({ type: 'text', nullable: true, comment: '职位描述' })
  description: string | null;

  @Column({ type: 'text', nullable: true, comment: '任职要求' })
  requirement: string | null;

  @Column({ type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1发布，0下架' })
  isActive: number;
}
