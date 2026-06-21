// src/modules/roles/entities/role.entity.ts

import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';

import { Menu } from '../../auth/entities/menu.entity';
import { TenantBaseEntity } from '@/database/base.entity';
import { Department } from '@/modules/system/entities/department.entity';

export type RoleScope = 'platform' | 'tenant';
export type RoleDataScope = 'ALL' | 'CUSTOM' | 'DEPT' | 'DEPT_AND_CHILD' | 'SELF';

@Entity('roles')
export class Role extends TenantBaseEntity {
  @Column({ comment: '角色名称' })
  name: string;
  @Column({ type: 'tinyint', default: 1, comment: '角色状态：1 启用，0 禁用' })
  isActive: number; // <--- 状态字段 1启用 0禁用
  @Column({ nullable: true, comment: '角色模板编码' })
  code: string;
  @Column({
    type: 'enum',
    enum: ['platform', 'tenant'],
    default: 'tenant',
    comment: '角色归属域：platform-平台角色，tenant-租户角色',
  })
  scope: RoleScope;
  @Column({ nullable: true, comment: '备注' })
  remark: string;
  @Column({ default: false, comment: '是否为系统初始化角色' })
  isSystem: boolean;
  @Column({
    type: 'enum',
    enum: ['ALL', 'CUSTOM', 'DEPT', 'DEPT_AND_CHILD', 'SELF'],
    default: 'ALL',
    comment: '数据权限范围：全部、自定义部门、本部门、本部门及以下、仅本人',
  })
  dataScope: RoleDataScope;

  @ManyToMany(() => Menu)
  @JoinTable({
    name: 'role_menus',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'menuId', referencedColumnName: 'id' },
  })
  menus: Menu[];

  @ManyToMany(() => Department)
  @JoinTable({
    name: 'role_departments',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'departmentId', referencedColumnName: 'id' },
  })
  departments: Department[];
}
