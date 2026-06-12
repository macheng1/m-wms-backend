import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMiniappOrderDto {
  @ApiProperty({ description: '被订购产品所属租户ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '产品ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '订购数量', example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsString()
  @MaxLength(80)
  contactName: string;

  @ApiProperty({ description: '联系人手机号', example: '13800138000' })
  @IsString()
  @MaxLength(30)
  contactPhone: string;

  @ApiPropertyOptional({ description: '收货或联系地址' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ description: '订购备注' })
  @IsString()
  @IsOptional()
  remark?: string;
}
