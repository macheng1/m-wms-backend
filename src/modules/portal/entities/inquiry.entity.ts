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
    default: 'unread',
    comment: '处理状态：unread-未读, read-已读, replied-已回复',
  })
  status: string; // valueEnum: { unread: { text: "未读", color: "amber" }, read: { text: "已读", color: "blue" }, replied: { text: "已回复", color: "green" } }

  @Column({ type: 'text', nullable: true, comment: '后台管理员备注' })
  adminRemark: string;

  @Column({ type: 'text', nullable: true, comment: '附件列表，逗号分隔的文件路径或URL' })
  attachments: string;
}
