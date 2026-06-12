import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({ description: '员工ID' })
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: '状态：1启用，0禁用', example: 1 })
  @IsNumber()
  isActive: number;
}
