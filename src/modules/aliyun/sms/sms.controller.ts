import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('短信模块')
@Controller('send')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}
  @ApiQuery({
    name: 'phone',
    type: String,
    description: '手机号码',
    required: true,
    example: '13775082575',
  })
  @Get('sendSMS')
  @ApiOperation({ summary: '手机验证码' })
  @Public()
  async sendSms(@Query('phone') phone: string) {
    return this.smsService.sendPhone(phone);
  }
}
