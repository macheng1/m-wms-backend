// src/modules/auth/services/system-init.service.ts
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { flattenPermissions } from '@/common/constants/permissions.constant';

@Injectable()
export class SystemInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemInitService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  /**
   * NestJS 钩子：应用启动并挂载模块后自动执行
   * 作用：实现“配置即数据”，减少手动操作数据库的风险
   */
  async onApplicationBootstrap() {
    this.logger.log('--- 🚀 正在同步全平台功能权限集 ---');

    // 1. 获取在 constants 文件中定义好的扁平化权限数组
    const permissions = flattenPermissions();

    try {
      /**
       * 2. 执行 upsert (更新或插入) 操作
       * - 参数1: 要同步的数据数组
       * - 参数2: 冲突判断依据。如果数据库中已存在相同的 'code'，则触发更新而非报错
       */
      await this.permissionRepo.upsert(
        permissions.map((p) => ({
          code: p.code, // 唯一标识，如 'wh:inbound'
          name: p.name, // 显示名称，如 '扫码入库'
          module: p.module, // 所属模块，如 '仓库管理'
          isMenu: p.isMenu || false, // 是否在飞冰前端侧边栏显示
        })),
        ['code'],
      );

      this.logger.log(`✅ 同步成功：当前系统共有 ${permissions.length} 个功能点`);
    } catch (error) {
      this.logger.error('❌ 权限同步失败，请检查数据库连接或字段定义:', error.message);
    }
  }
}
