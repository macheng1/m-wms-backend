import { IsString, IsEnum, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';
import { UnitCategory } from '../../../common/constants/unit.constant';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DetailUnitDto {
  @ApiPropertyOptional({ description: '单位ID' })
  @IsString()
  @ValidateIf((o) => !o.code)
  id?: string;

  @ApiPropertyOptional({ description: '单位编码' })
  @IsString()
  @Type(() => String)
  @ValidateIf((o) => !o.id)
  code?: string;
}
