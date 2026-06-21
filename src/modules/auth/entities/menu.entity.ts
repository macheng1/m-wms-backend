import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type MenuScope = 'platform' | 'tenant';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '菜单/权限唯一标识码，需与前端 MENU_CONFIG 的 code 一一对应' })
  code: string;

  @Column({
    type: 'enum',
    enum: ['platform', 'tenant'],
    default: 'tenant',
    comment: '菜单归属域：platform-平台超级管理员，tenant-租户管理员/员工',
  })
  scope: MenuScope;

  @Column({ comment: '菜单名称' })
  name: string;

  @Column({ nullable: true, comment: '前端菜单路由，对应 my-wms 的实际页面路径' })
  routePath: string | null;

  @Column({ nullable: true, comment: '前端组件路径，动态路由场景使用' })
  componentPath: string | null;

  @Column({ nullable: true, comment: '前端菜单图标标识' })
  icon: string | null;

  @Column({ type: 'int', default: 0, comment: '菜单排序' })
  sortOrder: number;

  @Column({ type: 'tinyint', default: 0, comment: '是否隐藏菜单' })
  isHidden: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1启用，0停用' })
  isActive: number;

  @Column({
    type: 'enum',
    enum: ['DIRECTORY', 'MENU', 'BUTTON', 'API'],
    default: 'MENU',
    comment: '菜单类型：目录、菜单、按钮、接口',
  })
  type: string;

  @Column({ default: 0, comment: '父级菜单ID，用于后台配置时的树形展示' })
  parentId: number;

  @Column({ nullable: true, comment: '描述信息' })
  description: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;
}
