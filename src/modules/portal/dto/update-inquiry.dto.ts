import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateInquiryStatusDto {
  @ApiProperty({ example: 'read', enum: ['unread', 'read', 'replied'] })
  @IsIn(['unread', 'read', 'replied'])
  status: 'unread' | 'read' | 'replied';
}

export class UpdateInquiryRemarkDto {
  @ApiProperty({ required: false, example: '已电话沟通，客户需要下周报价。' })
  @IsOptional()
  @IsString()
  adminRemark?: string;
}
