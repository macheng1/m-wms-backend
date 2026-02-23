import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty, IsInt } from 'class-validator';

// src/modules/attributes/dto/save-option.dto.ts
export class SaveOptionDto {
  @ApiProperty({ description: '如果是更新，需传此ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '关联的属性ID' })
  @IsNotEmpty({ message: '必须关联一个属性' })
  @IsString()
  attributeId: string;

  @ApiProperty({ description: '规格具体数值，如 12mm' })
  @IsNotEmpty({ message: '规格值不能为空' })
  @IsString()
  value: string;
  @ApiProperty({ description: '状态：1 启用，0 禁用', example: 1 })
  @IsOptional()
  @IsInt()
  isActive: number; //
  @ApiProperty({ description: '排序号' })
  @IsOptional()
  @IsInt()
  sort: number = 0;
}
