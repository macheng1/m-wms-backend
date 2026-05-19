import { Module } from '@nestjs/common';
import { MiniappApiController } from './miniapp-api.controller';

@Module({
  controllers: [MiniappApiController],
})
export class MiniappApiModule {}
