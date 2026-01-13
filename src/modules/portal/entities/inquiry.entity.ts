// src/modules/portal/entities/inquiry.entity.ts
import { TenantBaseEntity } from '@/database/base.entity';
import { Entity, Column } from 'typeorm';

@Entity('inquiries')
export class Inquiry extends TenantBaseEntity {
  @Column({ comment: '访客姓名' })
  name: string;

  @Column({ comment: '联系电话' })
  phone: string;

  @Column({ type: 'text', comment: '留言内容/需求描述' })
  message: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    comment: '处理状态：pending-待处理, processed-已联系, ignored-忽略',
  })
  status: string;

  @Column({ type: 'text', nullable: true, comment: '后台管理员备注' })
  adminRemark: string;

  @Column({ type: 'text', nullable: true, comment: '附件列表，逗号分隔的文件路径或URL' })
  attachments: string;
}
