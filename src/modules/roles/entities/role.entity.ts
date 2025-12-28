// src/modules/roles/entities/role.entity.ts

import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';

import { Permission } from '../../auth/entities/permission.entity';
import { TenantBaseEntity } from '@/database/base.entity';

@Entity('roles')
export class Role extends TenantBaseEntity {
  @Column({ comment: '角色名称' })
  name: string;

  @Column({ nullable: true, comment: '角色模板编码' })
  code: string;

  @Column({ default: false, comment: '是否为系统初始化角色' })
  isSystem: boolean;

  @ManyToMany(() => Permission)
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];
}
