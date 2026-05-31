import { IsOptional, IsString } from 'class-validator';

export class ApplyMiniappTenantDto {
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  creditCode?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  mainProducts?: string;

  @IsOptional()
  @IsString()
  businessLicenseImage?: string;
}
