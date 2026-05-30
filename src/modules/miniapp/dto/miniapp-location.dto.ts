import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class MiniappLocationDto {
  @ApiProperty({ required: false, description: '纬度' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false, description: '经度' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
