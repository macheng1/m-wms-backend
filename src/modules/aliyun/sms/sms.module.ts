import { Global, Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
@Global()
@Module({
  imports: [],
  controllers: [SmsController],
  providers: [SmsService],
})
export class SmsModule {}
