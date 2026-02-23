import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateLocationDto } from './create-location.dto';

/**
 * 更新库位DTO（所有字段可选）
 */
export class UpdateLocationDto extends PartialType(
  OmitType(CreateLocationDto, [] as const),
) {}
