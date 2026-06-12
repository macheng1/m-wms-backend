import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig, databaseConfig, jwtConfig, openApiConfig, redisConfig } from '@config/index';
import { TenantModule } from '@modules/tenant/tenant.module';
import { AuthModule } from '@modules/auth/auth.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { OrderModule } from '@modules/order/order.module';
import { UnitModule } from '@modules/unit/unit.module';
import { LocationModule } from '@modules/location/location.module';
import { User } from './modules/users/entities/user.entity';
import { Tenant } from './modules/tenant/entities/tenant.entity';
import { Permission } from './modules/auth/entities/permission.entity';
import { Menu } from './modules/auth/entities/menu.entity';
import { Role } from './modules/roles/entities/role.entity';
import { Inventory } from './modules/inventory/entities/inventory.entity';
import { Order } from './modules/order/entities/order.entity';
import { resolve } from 'path';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { SmsModule } from './modules/aliyun/sms/sms.module';
import { UploadModule } from './modules/upload/upload.module';
import { RolesModule } from './modules/roles/roles.module';
import { ProductModule } from './modules/product/product.module';
import { PortalModule } from './modules/portal/portal.module';
import { RedisModule } from './modules/redis/redis.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminApiModule } from './modules/admin/admin-api.module';
import { MiniappApiModule } from './modules/miniapp/miniapp-api.module';
import { OpenApiModule } from './modules/open/open-api.module';
import { SystemModule } from './modules/system/system.module';
import { AuditModule } from './common/audit/audit.module';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
console.log('当前运行环境:', process.env.NODE_ENV);
console.log('当前工作目录:', process.cwd());
@Module({
  imports: [
    // Load environment config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), 'envs', `.env.${process.env.NODE_ENV || 'development'}`),
      load: [appConfig, databaseConfig, jwtConfig, openApiConfig, redisConfig],
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        // 禁止自动同步表结构；数据库变更统一走 dbsql/ 或 migration。
        synchronize: false,
        logging: configService.get('database.logging'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        autoLoadEntities: true,
        extra: {
          connectionLimit: 10, // 增加连接池大小
          maxIdle: 5,
          idleTimeout: 60000,
          connectTimeout: 20000, // 连接超时设置（毫秒）
          enableKeepAlive: true,
          keepAliveInitialDelay: 0,
          waitForConnections: true,
        },
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: { expiresIn: configService.get('jwt.expiresIn') },
      }),
    }),
    // 全局注册所有实体的 repository
    TypeOrmModule.forFeature([User, Tenant, Permission, Menu, Role, Inventory, Order]),
    // Infrastructure modules
    RedisModule,
    AuditModule,
    // Business modules
    TenantModule,
    AuthModule,
    UnitModule,
    InventoryModule,
    OrderModule,
    LocationModule,
    UsersModule,
    SmsModule,
    UploadModule,
    RolesModule,
    HealthModule,
    ProductModule,
    PortalModule,
    AdminApiModule,
    MiniappApiModule,
    OpenApiModule,
    NotificationsModule,
    SystemModule,
  ],
  providers: [
    {
      // 声明全局守卫
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer) {
    void _consumer;
    // consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
