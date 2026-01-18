import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly keyPrefix: string;

  constructor(private configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('app.nodeEnv') || 'development';
    this.keyPrefix = `${nodeEnv}:`;
  }

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      db: this.configService.get<number>('redis.db'),
      password: this.configService.get<string>('redis.password'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * 生成带环境前缀的 key
   */
  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * 设置缓存
   * @param key 键名
   * @param value 值（会自动序列化为 JSON）
   * @param ttl 过期时间（秒），可选
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const fullKey = this.getKey(key);
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await this.client.setex(fullKey, ttl, stringValue);
    } else {
      await this.client.set(fullKey, stringValue);
    }
  }

  /**
   * 获取缓存
   * @param key 键名
   * @returns 值（自动解析 JSON）
   */
  async get(key: string): Promise<string | null> {
    const fullKey = this.getKey(key);
    const value = await this.client.get(fullKey);
    return value;
  }

  /**
   * 获取并解析 JSON
   * @param key 键名
   * @returns 解析后的对象
   */
  async getJson<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * 删除缓存
   * @param key 键名
   */
  async del(key: string): Promise<number> {
    const fullKey = this.getKey(key);
    return await this.client.del(fullKey);
  }

  /**
   * 检查 key 是否存在
   * @param key 键名
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const result = await this.client.exists(fullKey);
    return result === 1;
  }

  /**
   * 设置过期时间
   * @param key 键名
   * @param ttl 过期时间（秒）
   */
  async expire(key: string, ttl: number): Promise<void> {
    const fullKey = this.getKey(key);
    await this.client.expire(fullKey, ttl);
  }

  /**
   * 获取剩余过期时间
   * @param key 键名
   * @returns 剩余秒数，-1 表示永久存在，-2 表示不存在
   */
  async ttl(key: string): Promise<number> {
    const fullKey = this.getKey(key);
    return await this.client.ttl(fullKey);
  }

  /**
   * 批量删除匹配的 key
   * @param pattern 匹配模式，如 'user:*'
   */
  async delPattern(pattern: string): Promise<number> {
    const fullPattern = this.getKey(pattern);
    const keys = await this.client.keys(fullPattern);
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  /**
   * 存储验证码
   * @param identifier 标识符（手机号或邮箱）
   * @param code 验证码
   * @param ttl 有效期（秒），默认 60 秒
   */
  async setVerificationCode(identifier: string, code: string, ttl: number = 60): Promise<void> {
    const key = `verification_code:${identifier}`;
    await this.set(key, code, ttl);
  }

  /**
   * 验证验证码
   * @param identifier 标识符（手机号或邮箱）
   * @param code 验证码
   * @returns 是否正确
   */
  async verifyCode(identifier: string, code: string): Promise<boolean> {
    const key = `verification_code:${identifier}`;
    const storedCode = await this.get(key);
    if (!storedCode) return false;
    return storedCode === code;
  }

  /**
   * 删除验证码（验证成功后调用）
   * @param identifier 标识符（手机号或邮箱）
   */
  async deleteVerificationCode(identifier: string): Promise<void> {
    const key = `verification_code:${identifier}`;
    await this.del(key);
  }
}
