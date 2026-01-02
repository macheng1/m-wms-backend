import { ApiProperty } from '@nestjs/swagger';

export class AttributeListItemDto {
  @ApiProperty({ description: '属性ID' })
  id: string;

  @ApiProperty({ description: '属性名称' })
  name: string;

  @ApiProperty({ description: '属性编码' })
  code: string;

  @ApiProperty({ description: '输入类型' })
  type: string;

  @ApiProperty({ description: '单位' })
  unit?: string;

  @ApiProperty({ description: '状态' })
  isActive: number;
}
