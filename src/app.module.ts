import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig, databaseConfig, jwtConfig } from '@config/index';
import { TenantMiddleware } from '@common/middleware';
import { TenantModule } from '@modules/tenant/tenant.module';
import { AuthModule } from '@modules/auth/auth.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { OrderModule } from '@modules/order/order.module';
import { resolve } from 'path';
console.log('当前运行环境:', process.env.NODE_ENV);
console.log('当前工作目录:', process.cwd());
@Module({
  imports: [
    // Load environment config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(process.cwd(), 'envs', `.env.${process.env.NODE_ENV || 'development'}`),
      load: [appConfig, databaseConfig, jwtConfig],
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
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('database.logging'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        autoLoadEntities: true,
      }),
    }),

    // Business modules
    TenantModule,
    AuthModule,
    InventoryModule,
    OrderModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
