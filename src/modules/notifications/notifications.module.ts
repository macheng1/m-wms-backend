import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { SseConnectionManager } from './services/sse-connection.manager';

/**
 * 通知模块
 *
 * 提供实时通知功能，包括：
 * - SSE 实时推送
 * - 通知历史存储
 * - 多维度推送（租户/用户/角色）
 * - Redis Pub/Sub 支持多实例部署
 */
@Module({
  imports: [
    // 注册通知实体
    TypeOrmModule.forFeature([Notification]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, SseConnectionManager],
  exports: [NotificationsService, SseConnectionManager],
})
export class NotificationsModule implements OnModuleInit, OnModuleDestroy {
  private redisSubscriber: Redis;
  private redisPublisher: Redis;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 创建 Redis 连接
   * 用于通知的 Pub/Sub 功能
   */
  private createRedisConnection(): Redis {
    const redis = new Redis({
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      db: this.configService.get<number>('redis.db'),
      password: this.configService.get<string>('redis.password'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on('error', (err) => {
      console.error('Notifications Redis Error:', err);
    });

    return redis;
  }

  /**
   * 模块初始化完成后的回调
   *
   * 创建单独的订阅者和发布者连接
   */
  async onModuleInit(): Promise<void> {
    // 等待依赖模块初始化
    setTimeout(() => {
      // 创建单独的订阅者连接
      this.redisSubscriber = this.createRedisConnection();
      this.notificationsService.setRedisSubscriber(this.redisSubscriber);

      // 创建单独的发布者连接
      this.redisPublisher = this.createRedisConnection();
      this.notificationsService.setRedisPublisher(this.redisPublisher);

      console.log('Notifications Redis Pub/Sub 连接已初始化（订阅者/发布者分离）');
    }, 1000);
  }

  /**
   * 模块销毁时的回调
   * 关闭 Redis 连接
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit().catch(() => {});
    }
    if (this.redisPublisher) {
      await this.redisPublisher.quit().catch(() => {});
    }
  }
}
