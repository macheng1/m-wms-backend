import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(100)
  username: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  smsCode: string;

  @IsEmail()
  @IsOptional()
  email?: string;

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
