// src/modules/auth/services/system-seed.service.ts
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SystemSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.initPlatformAdmin();
  }

  private async initPlatformAdmin() {
    const rootUsername = 'platform_admin'; // 你可以自定义上帝账号

    // 1. 检查是否已经存在
    const exists = await this.userRepo.findOne({
      where: { username: rootUsername },
    });

    if (!exists) {
      this.logger.log('--- 🛡️ 正在初始化平台超级管理员 ---');

      const hashedPassword = await bcrypt.hash('Admin123456', 10); // 初始密码

      const superAdmin = this.userRepo.create({
        username: rootUsername,
        password: hashedPassword,
        nickname: '系统创始人',
        isPlatformAdmin: true, // 标记为平台级
        tenantId: null, // 平台级管理员不属于任何租户
        isActive: true,
      });

      await this.userRepo.save(superAdmin);
      this.logger.log(`✅ 平台管理员初始化成功: ${rootUsername} / Admin123456`);
      this.logger.warn('请务必在首次登录后修改初始密码！');
    }
  }
}
