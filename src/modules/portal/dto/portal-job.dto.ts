import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryPortalJobDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  isActive?: number;
}

export class SavePortalJobDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: '外贸业务员' })
  @IsString()
  @MaxLength(100)
  position: string;

  @ApiProperty({ required: false, example: 2 })
  @IsOptional()
  @IsInt()
  count?: number;

  @ApiProperty({ required: false, example: '8k-12k' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salary?: string;

  @ApiProperty({ required: false, example: '无锡' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiProperty({ required: false, example: '1-3年' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  experience?: string;

  @ApiProperty({ required: false, example: '大专及以上' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  education?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requirement?: string;

  @ApiProperty({ required: false, example: 0 })
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  isActive?: number;
}
