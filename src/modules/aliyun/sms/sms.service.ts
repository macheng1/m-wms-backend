import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const Core = require('@alicloud/pop-core');

@Injectable()
export class SmsService {
  private readonly client: any;

  constructor(private configService: ConfigService) {
    this.client = new Core({
      accessKeyId: 'LTAI5tELJkqHKd7X96oTLZuK',
      accessKeySecret: 'TsXjegLgFZo3EzLNyzyEpGouqHmhPZ',
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25',
    });
  }

  async sendPhone(phone) {
    const code = Math.random().toString().slice(2, 8);
    const params = {
      PhoneNumbers: phone,
      SignName: '元思科技',
      TemplateCode: 'SMS_243170958',
      TemplateParam: JSON.stringify({ code }),
    };
    console.log(phone);
    try {
      const result = await this.client.request('SendSms', params);
      if (result.Code == 'OK') return code;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }
}
