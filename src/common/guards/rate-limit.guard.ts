import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '@/modules/redis/redis.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '@/common/decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const key = this.buildKey(request, options);
    const count = await this.redisService.Client.incr(key);

    if (count === 1) {
      await this.redisService.Client.expire(key, options.durationSeconds);
    }

    if (count > options.points) {
      throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private buildKey(request: any, options: RateLimitOptions) {
    const ip = this.getClientIp(request);
    const fieldValues = (options.keyFields || [])
      .map((field) => this.getFieldValue(request, field))
      .filter(Boolean)
      .join(':');

    return ['rate-limit', options.keyPrefix, ip, fieldValues].filter(Boolean).join(':');
  }

  private getClientIp(request: any) {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || '');
    return ip.split(',')[0].trim() || request.ip || request.socket?.remoteAddress || 'unknown';
  }

  private getFieldValue(request: any, field: string) {
    return String(request.body?.[field] ?? request.query?.[field] ?? request.params?.[field] ?? '')
      .trim()
      .replace(/[^a-zA-Z0-9@._:-]/g, '');
  }
}
