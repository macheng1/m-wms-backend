// src/modules/portal/dto/create-inquiry.dto.ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInquiryDto {
  @ApiProperty({ example: '张先生', description: '访客姓名' })
  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  @MaxLength(20)
  name: string;

  @ApiProperty({ example: '15251092328', description: '联系电话' })
  @IsNotEmpty({ message: '联系电话不能为空' })
  // 建议根据实际情况校验，此处示例为简单字符串
  @IsString()
  phone: string;

  @ApiProperty({ example: '我想咨询不锈钢引出棒的报价', description: '需求描述' })
  @IsString()
  @IsNotEmpty({ message: '留言内容不能为空' })
  @MaxLength(500, { message: '内容不能超过500字' })
  message: string;

  @ApiProperty({
    example: '["/path/to/file1.jpg", "/path/to/file2.jpg"]',
    description: '附件列表，逗号分隔的文件路径或URL',
  })
  @IsString({ each: true })
  attachments?: string;
}
