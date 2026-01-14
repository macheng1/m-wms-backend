// src/modules/roles/entities/role.entity.ts

import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';

import { Permission } from '../../auth/entities/permission.entity';
import { TenantBaseEntity } from '@/database/base.entity';

@Entity('roles')
export class Role extends TenantBaseEntity {
  @Column({ comment: '角色名称' })
  name: string;
  @Column({ type: 'tinyint', default: 1, comment: '角色状态：1 启用，0 禁用' })
  isActive: number; // <--- 状态字段 1启用 0禁用
  @Column({ nullable: true, comment: '角色模板编码' })
  code: string;
  @Column({ nullable: true, comment: '备注' })
  remark: string;
  @Column({ default: false, comment: '是否为系统初始化角色' })
  isSystem: boolean;

  @ManyToMany(() => Permission)
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];
}
