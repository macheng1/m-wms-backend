// src/modules/auth/services/system-seed.service.ts
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../users/entities/user.entity';
import { Permission } from './permission.entity';
import { flattenPermissions } from '@/common/constants/permissions.constant';
import { Dictionary } from '@/modules/system/entities/dictionary.entity';

@Injectable()
export class SystemSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Dictionary)
    private readonly dictRepo: Repository<Dictionary>,
  ) {}

  async onApplicationBootstrap() {
    await this.initPermissions();
    await this.initPlatformAdmin();
    await this.initIndustryDicts();
  }
  /**
   * 初始化行业分类字典（仅首次插入）
   */
  private async initIndustryDicts() {
    const industryDicts = [
      {
        type: 'INDUSTRY',
        label: '金属制品业 (不锈钢、引出棒、紧固件)',
        value: 'C33',
        sort: 1,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '电气机械和器材制造 (电热元件、电加热管)',
        value: 'C38',
        sort: 2,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '通用设备制造业 (数控机床、机械零部件)',
        value: 'C34',
        sort: 3,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '专用设备制造业 (化工机械、食品机械)',
        value: 'C35',
        sort: 4,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '黑色金属冶炼和压延加工 (不锈钢型材)',
        value: 'C32',
        sort: 5,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '专业技术服务业 (工业设计、技术研发)',
        value: 'M74',
        sort: 6,
        isActive: 1,
      },
      {
        type: 'INDUSTRY',
        label: '批发业 (钢材贸易、物料分销)',
        value: 'F51',
        sort: 7,
        isActive: 1,
      },
      { type: 'INDUSTRY', label: '其他行业', value: 'OTHER', sort: 8, isActive: 1 },
    ];
    for (const dict of industryDicts) {
      const exist = await this.dictRepo.findOne({ where: { type: dict.type, value: dict.value } });
      if (!exist) {
        await this.dictRepo.save(this.dictRepo.create(dict));
        this.logger.log(`插入行业字典: ${dict.label}`);
      }
    }
    this.logger.log('行业分类字典初始化/同步完成');
  }

  /**
   * 初始化权限表，自动同步 PERMISSION_CONFIG
   */
  private async initPermissions() {
    const all = flattenPermissions();
    for (const item of all) {
      let exist = await this.permissionRepo.findOne({ where: { code: item.code } });
      if (!exist) {
        exist = this.permissionRepo.create({
          code: item.code,
          name: item.name,
          description: item.description || '',
          type: item.isMenu ? 'MENU' : 'API',
          parentId: 0, // 如有 parentCode 可自行扩展
        });
        await this.permissionRepo.save(exist);
        this.logger.log(`插入权限: ${item.code} - ${item.name}`);
      } else {
        // 可选：自动更新 name/desc/type
        exist.name = item.name;
        exist.description = item.description || '';
        exist.type = item.isMenu ? 'MENU' : 'API';
        await this.permissionRepo.save(exist);
        this.logger.log(`更新权限: ${item.code} - ${item.name}`);
      }
    }
    this.logger.log('权限表初始化/同步完成');
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
        realName: '默认',
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
