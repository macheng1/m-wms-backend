// src/modules/portal/dto/inquiries-detail.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class InquiriesDetailDto {
  @ApiProperty({ example: 1, description: '询盘ID' })
  id: number;

  @ApiProperty({ example: 'tenant_123', description: '租户ID' })
  tenantId: string;

  @ApiProperty({ example: '张先生', description: '访客姓名' })
  name: string;

  @ApiProperty({ example: '15251092328', description: '联系电话' })
  phone: string;

  @ApiProperty({ example: 'visitor@example.com', description: '邮箱' })
  email?: string;

  @ApiProperty({ example: '我想咨询不锈钢引出棒的报价', description: '需求描述' })
  message: string;

  @ApiProperty({
    example: ['/path/to/file1.jpg', '/path/to/file2.jpg'],
    description: '附件列表，文件路径或URL数组',
    type: [String],
  })
  attachments?: string;

  @ApiProperty({ example: 'unread', description: '处理状态', enum: ['unread', 'read', 'replied'] })
  status: 'unread' | 'read' | 'replied';

  @ApiProperty({ example: '已回复内容', description: '回复内容' })
  reply?: string;

  @ApiProperty({ example: '2026-01-13T12:00:00Z', description: '回复时间' })
  replyAt?: string;

  @ApiProperty({ example: '2026-01-13T12:00:00Z', description: '创建时间' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-13T12:00:00Z', description: '更新时间' })
  updatedAt: string;

  @ApiProperty({ example: '192.168.1.1', description: '访客IP' })
  ip?: string;

  @ApiProperty({ example: '官网', description: '来源渠道' })
  source?: string;
}
