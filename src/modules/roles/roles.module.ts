// src/modules/roles/roles.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { RolesController } from './roles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [
    // 2. 注册刚才规范化的控制器
    RolesController,
  ],
  providers: [
    // 3. 注册业务逻辑服务
    RolesService,
  ],
  exports: [
    // 4. 重要：导出 RolesService，方便在 UsersModule 中查询员工的角色状态
    RolesService,
  ],
})
export class RolesModule {}
