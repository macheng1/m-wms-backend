import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @IsNotEmpty() id: string;
  @IsBoolean() isActive: boolean;
}
