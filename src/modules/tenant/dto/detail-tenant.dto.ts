import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DetailTenantDto {
  @ApiProperty({ description: '租户ID' })
  @IsNotEmpty({ message: '租户ID不能为空' })
  @IsString()
  id: string;
}
