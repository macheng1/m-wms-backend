// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { OperationLog } from '../admin/entities/operation-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, OperationLog])],
  providers: [UsersService],
  controllers: [UsersController],
  /**
   * 导出 UsersService，因为 AuthService 在验证登录时需要用到它
   */
  exports: [UsersService],
})
export class UsersModule {}
