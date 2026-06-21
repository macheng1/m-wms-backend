import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class LightUpDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locationIds?: string[];

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  ttlSeconds?: number;
}

export class LightOffDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;
}

export class ConfirmPtlDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  locationCode?: string;

  @IsOptional()
  @IsString()
  skuOrBarcode?: string;
}

export class SavePtlControllerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  deviceUid?: string;

  @IsOptional()
  config?: Record<string, any>;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class SavePtlBindingDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsInt()
  @Min(0)
  ledIndex: number;

  @IsOptional()
  @IsString()
  defaultColor?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CalibrateDto {
  @IsInt()
  @Min(0)
  ledIndex: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;
}
