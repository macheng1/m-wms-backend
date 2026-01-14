// src/modules/roles/dto/query-role.dto.ts
import { IsOptional, IsInt, Min, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRoleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1; // 当前页码

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 10; // 每页条数

  @IsOptional()
  @IsString()
  name?: string; // 支持按角色名模糊搜索

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  isActive?: number; // 支持按角色状态(0禁用/1启用)过滤
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[]; // 支持按权限码集合过
}
