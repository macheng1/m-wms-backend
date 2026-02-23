import { IsString, IsNumber, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustInventoryDto {
  @ApiProperty({ description: '产品编码/SKU' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: '调整数量（正数增加，负数减少）', example: 10 })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: '单位编码' })
  @IsString()
  @IsNotEmpty()
  unitCode: string;

  @ApiProperty({ description: '调整原因', example: '盘点调整' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiPropertyOptional({
    description: '库位ID（从 /api/locations/available-for-selection 接口获取 value）',
    example: 'location-uuid-001',
  })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional({
    description: '接收通知的用户ID列表（仓管员等），为空则不发送通知',
    example: ['user-123', 'user-456'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notifyUserIds?: string[];
}
