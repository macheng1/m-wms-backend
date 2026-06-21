import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { RedisService } from '@/modules/redis/redis.service';

@Injectable()
export class OpenApiSignatureGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const appKey = this.getHeader(request, 'x-app-key');
    const timestamp = this.getHeader(request, 'x-timestamp');
    const nonce = this.getHeader(request, 'x-nonce');
    const signature = this.getHeader(request, 'x-signature');
    const configuredAppKey = this.configService.get<string>('openApi.appKey');
    const appSecret = this.configService.get<string>('openApi.appSecret');
    const signWindowSeconds = this.configService.get<number>('openApi.signWindowSeconds') || 300;

    if (!configuredAppKey || !appSecret) {
      throw new ServiceUnavailableException('Open API 签名配置未启用');
    }

    if (!appKey || !timestamp || !nonce || !signature) {
      throw new UnauthorizedException('Open API 签名参数缺失');
    }

    if (appKey !== configuredAppKey) {
      throw new UnauthorizedException('Open API appKey 无效');
    }

    const timestampMs = Number(timestamp);
    if (!Number.isFinite(timestampMs)) {
      throw new UnauthorizedException('Open API timestamp 无效');
    }

    const now = Date.now();
    if (Math.abs(now - timestampMs) > signWindowSeconds * 1000) {
      throw new UnauthorizedException('Open API 签名已过期');
    }

    const expectedSignature = this.signRequest(request, timestamp, nonce, appSecret);
    if (!this.safeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException('Open API 签名错误');
    }

    await this.assertNonceUnused(appKey, nonce, signWindowSeconds);

    return true;
  }

  private signRequest(request: any, timestamp: string, nonce: string, appSecret: string) {
    const method = String(request.method || 'GET').toUpperCase();
    const path = String(request.originalUrl || request.url || '').split('?')[0];
    const bodyHash = createHash('sha256')
      .update(this.canonicalJson(request.body || {}))
      .digest('hex');
    const payload = [method, path, timestamp, nonce, bodyHash].join('\n');

    return createHmac('sha256', appSecret).update(payload).digest('hex');
  }

  private async assertNonceUnused(appKey: string, nonce: string, ttlSeconds: number) {
    const key = `open-api:nonce:${appKey}:${nonce}`;
    const result = await this.redisService.Client.set(key, '1', 'EX', ttlSeconds, 'NX');
    if (result !== 'OK') {
      throw new UnauthorizedException('Open API nonce 已使用');
    }
  }

  private canonicalJson(value: any): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonicalJson(item)).join(',')}]`;
    }

    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.canonicalJson(value[key])}`)
      .join(',')}}`;
  }

  private safeEqual(actual: string, expected: string) {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);
    return (
      actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private getHeader(request: any, name: string): string {
    const value = request.headers?.[name];
    return Array.isArray(value) ? value[0] : String(value || '');
  }
}
