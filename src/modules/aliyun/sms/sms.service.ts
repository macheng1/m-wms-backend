import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/modules/redis/redis.service';
const Core = require('@alicloud/pop-core');

@Injectable()
export class SmsService {
  private readonly client: any;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.client = new Core({
      accessKeyId: this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_ID'),
      accessKeySecret: this.configService.get<string>('ALIYUN_SMS_ACCESS_KEY_SECRET'),
      endpoint: this.configService.get<string>('ALIYUN_SMS_ENDPOINT'),
      apiVersion: '2017-05-25',
    });
  }

  /**
   * 发送验证码短信并存储到 Redis
   * @param phone 手机号
   * @param ttl 验证码有效期（秒），默认 60 秒
   * @returns 验证码
   */
  async sendPhone(phone: string, ttl: number = 60) {
    const code = Math.random().toString().slice(2, 8);
    const params = {
      PhoneNumbers: phone,
      SignName: '元思科技',
      TemplateCode: 'SMS_243170958',
      TemplateParam: JSON.stringify({ code }),
    };
    console.log('发送验证码到:', phone);
    try {
      const result = await this.client.request('SendSms', params);
      if (result.Code == 'OK') {
        // 存储验证码到 Redis
        await this.redisService.setVerificationCode(phone, code, ttl);
        console.log(`验证码 ${code} 已发送并存储，有效期 ${ttl} 秒`);
        return code;
      } else {
        throw new Error(`短信发送失败: ${result.Message}`);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * 验证验证码
   * @param phone 手机号
   * @param code 验证码
   * @returns 是否正确
   */
  async verifyCode(phone: string, code: string): Promise<boolean> {
    return await this.redisService.verifyCode(phone, code);
  }

  /**
   * 删除验证码（验证成功后调用）
   * @param phone 手机号
   */
  async deleteCode(phone: string): Promise<void> {
    await this.redisService.deleteVerificationCode(phone);
  }
}
