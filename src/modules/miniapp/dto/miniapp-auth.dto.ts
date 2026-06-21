import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class MiniappSilentLoginDto {
  @ApiProperty({ description: 'Taro.login / wx.login 返回的 code' })
  @IsNotEmpty({ message: 'code 不能为空' })
  @IsString()
  code: string;

  @ApiProperty({ required: false, description: '小程序平台：wechat-微信，toutiao-抖音/头条' })
  @IsOptional()
  @IsString()
  @IsIn(['wechat', 'toutiao'])
  platform?: 'wechat' | 'toutiao';

  @ApiProperty({ required: false, description: '会员资料，可在静默登录后顺手更新昵称头像' })
  @IsOptional()
  @IsObject()
  profile?: Record<string, any>;
}
