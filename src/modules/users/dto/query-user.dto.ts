import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class QueryUserDto {
  @ApiProperty({ description: '用户名/昵称模糊搜索', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页条数', example: 20, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiProperty({ description: '状态筛选', required: false, example: 1 })
  @IsOptional()
  @IsInt()
  isActive?: number;
}
