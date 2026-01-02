// src/modules/users/entities/user.entity.ts
import { TenantBaseEntity } from '@/database/base.entity';
import { Role } from '@/modules/roles/entities/role.entity';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne } from 'typeorm';

@Entity('users')
export class User extends TenantBaseEntity {
  @Column({ unique: true, comment: '登录用户名' })
  username: string;

  @Column({ select: false, comment: '哈希后的密码' })
  password: string;

  @Column({ nullable: true, comment: '真实姓名' })
  realName: string;
  @Column({ nullable: true, comment: '头像地址' })
  avatar: string; // <--- 补上这个字段
  /**
   * 新增：平台超级管理员标识
   * true: 可以跨租户管理所有工厂数据（用于你自己或运维）
   * false: 普通租户用户（绝大部分工厂员工）
   */
  @Column({ default: false, comment: '是否为平台级超级管理员' })
  isPlatformAdmin: boolean;

  /**
   * 注意：如果你的 TenantBaseEntity 强制了 tenantId 必填，
   * 在这里你可能需要重写字段或确保基类允许 null（针对平台管理员）。
   */

  @ManyToMany(() => Role)
  @JoinTable({ name: 'user_roles' })
  roles: Role[];

  @Column({ default: true, comment: '账号是否激活' })
  isActive: boolean;
  // 建立与租户的关系，这样 getProfile 里的 user.tenant 才有值
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
