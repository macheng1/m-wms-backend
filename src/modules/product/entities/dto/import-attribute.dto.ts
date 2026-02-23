// src/modules/product/entities/dto/import-attribute.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

/**
 * 属性导入 DTO
 * 用于接收上传的 Excel 文件
 */
export class ImportAttributeDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '属性导入 Excel 文件',
  })
  @IsNotEmpty({ message: '请选择要导入的文件' })
  file: Express.Multer.File;
}

/**
 * 导入结果返回 DTO
 */
export class ImportResultDto {
  @ApiProperty({ description: '成功数量', example: 10 })
  successCount: number;

  @ApiProperty({ description: '失败数量', example: 2 })
  failCount: number;

  @ApiProperty({ description: '失败详情', isArray: true, required: false })
  errors?: Array<{
    row: number;
    name: string;
    reason: string;
  }>;
}
