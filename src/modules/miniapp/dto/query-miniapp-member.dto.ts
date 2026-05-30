import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMiniappMemberDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 20;

  @ApiProperty({ required: false, description: '昵称/手机号/openId 模糊搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, description: '小程序平台：wechat/toutiao' })
  @IsOptional()
  @IsString()
  @IsIn(['wechat', 'toutiao'])
  platform?: 'wechat' | 'toutiao';

  @ApiProperty({ required: false, description: '状态：1正常，0禁用' })
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  isActive?: number;
}

export class UpdateMiniappMemberStatusDto {
  @ApiProperty({ example: 1, description: '状态：1正常，0禁用' })
  @Type(() => Number)
  @IsIn([0, 1])
  isActive: number;
}

export class UpdateMiniappMemberRemarkDto {
  @ApiProperty({ required: false, description: '后台备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateMiniappMemberAuthorizationDto {
  @ApiProperty({ example: 'ad335177-debc-49e4-bab2-3f55cd74799c', description: '会员 ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: '1', description: '是否同意隐私协议：1是，0否' })
  @IsString()
  @IsIn(['0', '1'])
  isAuthorization: string;
}
