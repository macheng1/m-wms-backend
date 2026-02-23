import { ApiProperty } from '@nestjs/swagger';

/**
 * 导入结果返回 DTO
 */
export class ImportErrorDto {
  @ApiProperty({ description: '行号' })
  row: number;

  @ApiProperty({ description: '产品名称' })
  name: string;

  @ApiProperty({ description: '错误原因' })
  reason: string;
}

export class ImportProductResultDto {
  @ApiProperty({ description: '成功数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failCount: number;

  @ApiProperty({ description: '错误详情', type: [ImportErrorDto], required: false })
  errors?: ImportErrorDto[];
}

/**
 * 导入请求 DTO（用于 Swagger 文档）
 */
export class ImportProductDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '产品导入 Excel 文件',
  })
  file: any;
}
