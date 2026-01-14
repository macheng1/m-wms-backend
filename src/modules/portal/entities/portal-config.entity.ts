// src/modules/portal/entities/portal-config.entity.ts
import { TenantBaseEntity } from '@/database/base.entity';
import { Entity, Column } from 'typeorm';

@Entity('portal_configs')
export class PortalConfig extends TenantBaseEntity {
  @Column({ nullable: true, comment: '网站标题' })
  title: string;

  @Column({ nullable: true, comment: '网站Logo URL' })
  logo: string;

  @Column({ nullable: true, comment: '宣传标语/Slogan' })
  slogan: string;

  @Column({ type: 'text', nullable: true, comment: '工厂简介/关于我们' })
  description: string;

  /**
   * 页脚配置 (JSON)
   * 存储结构：{ "address": "...", "icp": "...", "copyright": "..." }
   */
  @Column({ type: 'json', nullable: true, comment: '页脚配置信息' })
  footerInfo: Record<string, any>;

  /**
   * SEO 配置 (JSON)
   * 存储结构：{ "keywords": "电热管,引出棒", "description": "..." }
   */
  @Column({ type: 'json', nullable: true, comment: 'SEO 优化配置' })
  seoConfig: Record<string, any>;

  @Column({ default: 1, comment: '站点状态：1开启，0关闭' })
  isActive: number;
}
