import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PublicTenantListDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数，最大 100', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '租户来源',
    enum: ['platform', 'miniapp', 'import', 'api', 'all'],
  })
  @IsOptional()
  @IsIn(['platform', 'miniapp', 'import', 'api', 'all'])
  tenantSource?: 'platform' | 'miniapp' | 'import' | 'api' | 'all';

  @ApiPropertyOptional({ description: '企业名称关键字' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class PublicTenantDetailDto {
  @ApiProperty({ description: '租户ID' })
  @IsString()
  id: string;
}
