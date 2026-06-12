import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SavePostDto {
  @ApiPropertyOptional({ description: '岗位ID，更新时传入' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '岗位编码', example: 'WMS_MANAGER' })
  @IsNotEmpty({ message: '岗位编码不能为空' })
  @IsString()
  postCode: string;

  @ApiProperty({ description: '岗位名称', example: '仓库主管' })
  @IsNotEmpty({ message: '岗位名称不能为空' })
  @IsString()
  postName: string;

  @ApiPropertyOptional({ description: '排序值', example: 0 })
  @IsOptional()
  postSort?: number;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用', example: 1 })
  @IsOptional()
  isActive?: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  remark?: string | null;
}

export class QueryPostDto {
  @ApiPropertyOptional({ description: '岗位编码模糊查询' })
  @IsOptional()
  postCode?: string;

  @ApiPropertyOptional({ description: '岗位名称模糊查询' })
  @IsOptional()
  postName?: string;

  @ApiPropertyOptional({ description: '状态：1启用，0禁用' })
  @IsOptional()
  isActive?: number;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  pageSize?: number;
}
