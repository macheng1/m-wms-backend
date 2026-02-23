import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @IsNotEmpty() id: string;
  @IsNumber() isActive: number;
}
