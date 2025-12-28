// src/modules/tenants/services/tenants.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ROLE_TEMPLATES } from '@/common/constants/role-templates.constant';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TenantsService {
  /**
   * 注入 DataSource 以便手动控制数据库事务
   */
  constructor(private dataSource: DataSource) {}

  /**
   * 租户入驻全闭环流程
   */
  async onboard(dto: CreateTenantDto) {
    // 1. 获取查询执行器 (QueryRunner) 以手动控制数据库连接
    const queryRunner = this.dataSource.createQueryRunner();

    // 2. 建立真实的数据库连接
    await queryRunner.connect();

    // 3. 开启事务：从此开始的所有数据库操作要么全成功，要么全失败
    await queryRunner.startTransaction();

    try {
      // --- 步骤 A: 创建租户主体 ---
      const tenant = queryRunner.manager.create(Tenant, {
        name: dto.name,
        industry: dto.industry || 'heating_element', // 默认电热管行业
      });
      const savedTenant = await queryRunner.manager.save(tenant);
      const tid = savedTenant.id; // 获取新生成的 UUID 租户 ID

      // --- 步骤 B: 根据系统模板初始化该租户的角色集 ---
      let adminRole: Role;

      // 遍历我们在 constants 中定义的角色模板（如 ADMIN, WAREHOUSE_KEEPER）
      for (const tpl of Object.values(ROLE_TEMPLATES)) {
        // b1. 根据模板里的 code 字符串，去全局权限表查找真实的权限实体对象
        const perms = await queryRunner.manager.find(Permission, {
          where: { code: In(tpl.permissionCodes) },
        });

        // b2. 为当前租户创建该角色实例
        const role = queryRunner.manager.create(Role, {
          tenantId: tid, // 关键：绑定租户隔离标识
          name: tpl.name, // 角色名，如 '系统管理员'
          code: tpl.code, // 模板编码，用于后期逻辑判断
          isSystem: true, // 标记为系统预设，防止租户管理员误删
          permissions: perms, // 建立多对多关联
        });

        const savedRole = await queryRunner.manager.save(role);

        // 如果当前遍历的是管理员模板，将其保存下来，下一步绑定给首个用户
        if (tpl.code === 'ADMIN') {
          adminRole = savedRole;
        }
      }

      // --- 步骤 C: 创建首位租户管理员（超级用户） ---
      // c1. 对密码进行加盐哈希，绝对不能存明文
      const hashedPassword = await bcrypt.hash(dto.adminPass, 10);

      // c2. 创建用户并绑定刚才生成的管理员角色
      const adminUser = queryRunner.manager.create(User, {
        tenantId: tid, // 关键：绑定租户隔离标识
        username: dto.adminUser,
        password: hashedPassword,
        nickname: '系统管理员',
        roles: [adminRole], // 关联角色
      });
      await queryRunner.manager.save(adminUser);

      // --- 步骤 D: 提交所有更改 ---
      // 只有执行到这一行，数据才真正写入 MySQL
      await queryRunner.commitTransaction();

      return {
        message: '租户入驻成功，权限初始化完成',
        tenantId: tid,
        adminUser: dto.adminUser,
      };
    } catch (err) {
      // --- 异常处理：回滚所有操作 ---
      // 如果上述任何一步出错（如用户名冲突），数据库会回到事务开始前的状态
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(`入驻流程中断，数据已回滚: ${err.message}`);
    } finally {
      // --- 释放连接 ---
      // 必须手动释放 queryRunner，否则会导致数据库连接泄露，服务器很快就会卡死
      await queryRunner.release();
    }
  }
}
