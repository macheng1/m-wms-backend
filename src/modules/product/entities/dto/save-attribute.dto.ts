// src/modules/attributes/entities/dto/save-attribute.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  ValidationArguments,
  MinLength,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/** 属性类型枚举 */
export enum AttributeType {
  SELECT = 'select',
  INPUT = 'input',
  NUMBER = 'number',
}

/** 自定义验证器：当type为select时，options必须有值 */
@ValidatorConstraint({ name: 'IsOptionsRequiredForSelect', async: false })
export class IsOptionsRequiredForSelectConstraint implements ValidatorConstraintInterface {
  validate(options: any, args: ValidationArguments) {
    const dto = args.object as SaveAttributeDto;
    // 如果类型是select，则options必须存在且不为空数组
    if (dto.type === AttributeType.SELECT) {
      return Array.isArray(options) && options.length > 0;
    }
    // 其他类型不需要校验options
    return true;
  }

  defaultMessage() {
    return '当属性类型为select时，必须提供至少一个选项';
  }
}

/** 规格选项子 DTO **/
export class AttributeOptionItemDto {
  @ApiProperty({ description: '选项ID（新增时不传，更新时由后端处理）', required: false })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: '选项值，如：不锈钢304、12.5' })
  @IsNotEmpty({ message: '选项值不能为空' })
  @IsString()
  @MinLength(1, { message: '选项值不能为空字符串' })
  @Transform(({ value }) => value?.trim()) // 自动去除首尾空格
  value: string;

  @ApiProperty({ description: '排序序号（数字越小越靠前）', default: 0 })
  @IsOptional()
  @IsNumber({}, { message: '排序必须是数字' })
  @Type(() => Number)
  sort?: number;

  @ApiProperty({ description: '状态：1启用，0禁用', default: 1 })
  @IsOptional()
  @IsNumber()
  @IsEnum([0, 1], { message: '状态只能是0或1' })
  isActive?: number;
}

/** 属性保存主 DTO **/
export class SaveAttributeDto {
  @ApiProperty({ description: '属性ID（更新时必传，新增时不传）', required: false })
  @IsOptional()
  @IsUUID('4', { message: '属性ID格式不正确' })
  @Transform(({ value }) => (value === '' ? undefined : value)) // 空字符串转为 undefined
  id?: string;

  @ApiProperty({ description: '属性名称', example: '材质' })
  @IsNotEmpty({ message: '属性名称不能为空' })
  @IsString()
  @MinLength(1, { message: '属性名称不能为空字符串' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: '业务编码（不传时自动生成）',
    example: 'ATTR_CZ_A1B2',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  code?: string;

  @ApiProperty({
    description: '输入类型',
    enum: AttributeType,
    example: AttributeType.SELECT,
  })
  @IsNotEmpty({ message: '输入类型不能为空' })
  @IsEnum(AttributeType, { message: '输入类型只能是 select、input 或 number' })
  type: AttributeType;

  @ApiProperty({ description: '单位（如：mm、kg、个）', required: false, example: 'mm' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  unit?: string;

  @ApiProperty({ description: '状态：1启用，0禁用', default: 1 })
  @IsOptional()
  @IsNumber()
  @IsEnum([0, 1], { message: '状态只能是0或1' })
  isActive?: number;

  @ApiProperty({
    description: '规格选项列表（当type为select时必填，其他类型可不传）',
    type: [AttributeOptionItemDto],
    required: false,
  })
  @IsOptional()
  @Validate(IsOptionsRequiredForSelectConstraint) // 自定义验证：select类型时必填
  @IsArray({ message: 'options必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => AttributeOptionItemDto)
  options?: AttributeOptionItemDto[];
}
