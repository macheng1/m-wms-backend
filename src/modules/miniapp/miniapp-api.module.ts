import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MiniappApiController } from './miniapp-api.controller';
import { MiniappMember } from './entities/miniapp-member.entity';
import { MiniappService } from './miniapp.service';

@Module({
  imports: [TypeOrmModule.forFeature([MiniappMember])],
  controllers: [MiniappApiController],
  providers: [MiniappService],
  exports: [MiniappService],
})
export class MiniappApiModule {}
