// src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [
    // 注册 User 实体，以便在 Service 中使用 InjectRepository
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  /**
   * 导出 UsersService，因为 AuthService 在验证登录时需要用到它
   */
  exports: [UsersService],
})
export class UsersModule {}
