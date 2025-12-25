import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(100)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}
