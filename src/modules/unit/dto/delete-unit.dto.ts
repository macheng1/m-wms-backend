import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteUnitDto {
  @ApiProperty({ description: '单位ID' })
  @IsString()
  id: string;
}
