// src/modules/roles/dto/query-role.dto.ts
import { IsOptional, IsInt, Min, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryRoleDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1; // 当前页码

  @ApiPropertyOptional({ description: '每页条数', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 10; // 每页条数

  @ApiPropertyOptional({ description: '角色名称模糊查询' })
  @IsOptional()
  @IsString()
  name?: string; // 支持按角色名模糊搜索

  @ApiPropertyOptional({ description: '状态：1启用，0禁用' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  isActive?: number; // 支持按角色状态(0禁用/1启用)过滤

  @ApiPropertyOptional({ description: '菜单编码数组', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  menuCodes?: string[]; // 支持按菜单码集合过滤
}
