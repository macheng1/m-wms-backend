// src/modules/auth/entities/permission.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '权限唯一标识，如 wh:inbound' })
  code: string;

  @Column({ comment: '权限显示名称' })
  name: string;

  @Column({ comment: '所属模块' })
  module: string;

  @Column({ default: false, comment: '是否为菜单项' })
  isMenu: boolean;
}
