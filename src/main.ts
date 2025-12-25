import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@common/filters';
import { TransformInterceptor, LoggingInterceptor } from '@common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port');
  const apiPrefix = configService.get<string>('app.apiPrefix');
  const corsOrigin = configService.get<string>('app.corsOrigin');

  // Enable CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
