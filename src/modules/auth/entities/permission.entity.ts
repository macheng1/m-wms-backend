// src/modules/auth/entities/permission.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '权限唯一标识码，需与前端 MENU_CONFIG 的 code 一一对应' })
  code: string; // 例如：wms:inventory:inbound

  @Column({ comment: '权限名称' })
  name: string; // 例如：入库办理

  @Column({
    type: 'enum',
    enum: ['MENU', 'BUTTON', 'API'],
    default: 'MENU',
    comment: '权限类型：菜单、按钮、接口',
  })
  type: string; // 替换 isMenu，更具扩展性

  @Column({ default: 0, comment: '父级权限ID，用于后台配置时的树形展示' })
  parentId: number; // 方便在角色授权页面做折叠显示

  @Column({ nullable: true, comment: '描述信息' })
  description: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;
}
