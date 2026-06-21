import { Module } from '@nestjs/common';
import { OpenApiController } from './open-api.controller';

@Module({
  controllers: [OpenApiController],
})
export class OpenApiModule {}
