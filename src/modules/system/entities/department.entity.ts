import { TenantBaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('departments')
@Index(['tenantId', 'deptCode'], { unique: true })
export class Department extends TenantBaseEntity {
  @Column({ type: 'char', length: 36, nullable: true, comment: '父部门ID，顶级为空' })
  parentId: string | null;

  @Column({ length: 50, comment: '部门编码' })
  deptCode: string;

  @Column({ length: 100, comment: '部门名称' })
  deptName: string;

  @Column({ default: 0, comment: '显示顺序' })
  orderNum: number;

  @Column({ length: 100, nullable: true, comment: '负责人' })
  leader: string | null;

  @Column({ length: 50, nullable: true, comment: '联系电话' })
  phone: string | null;

  @Column({ length: 100, nullable: true, comment: '邮箱' })
  email: string | null;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1正常，0停用' })
  isActive: number;
}
