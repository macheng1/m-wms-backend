// src/modules/tenants/services/tenants.service.ts
import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, In, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ROLE_TEMPLATES } from '@/common/constants/role-templates.constant';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 核心业务：租户入驻全自动化流程
   */
  async onboard(dto: CreateTenantDto) {
    // 1. 预检查：在进入事务前拦截明显错误，节省数据库连接资源
    await this.validateBeforeOnboard(dto);

    try {
      return await this.dataSource.transaction(async (manager) => {
        // Step A: 创建租户主体
        const tenant = await this.createTenant(manager, dto);

        // Step B: 并行初始化角色与权限（优化性能）
        const { adminRole } = await this.initTenantRoles(manager, tenant.id);

        // Step C: 创建租户超级管理员
        const adminUser = await this.createAdminUser(manager, tenant.id, dto, adminRole);

        // 返回给拦截器的数据负载
        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          adminId: adminUser.id,
          username: adminUser.username,
        };
      });
    } catch (error) {
      this.logger.error(`租户入驻失败: ${error.message}`, error.stack);
      // 如果是已知的业务异常则直接抛出，否则封装为 500
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('系统在处理租户入驻时发生未知错误');
    }
  }

  /**
   * 优化后的逻辑拆分 1：预校验（包含用户名和企业编码）
   */
  private async validateBeforeOnboard(dto: CreateTenantDto) {
    // 并行检查用户名和企业编码，提升效率
    const [existingUser, existingTenant] = await Promise.all([
      this.dataSource.getRepository(User).findOne({ where: { username: dto.adminUser } }),
      this.dataSource.getRepository(Tenant).findOne({ where: { code: dto.code } }),
    ]);

    if (existingUser) {
      throw new ConflictException(`用户名 ${dto.adminUser} 已被占用`);
    }
    if (existingTenant) {
      throw new ConflictException(`企业编码 ${dto.code} 已被占用`);
    }
  }
  /**
   * 逻辑拆分 2：创建租户
   */
  private async createTenant(manager: EntityManager, dto: CreateTenantDto): Promise<Tenant> {
    // 检查 code 是否已存在（防止数据库报错前先进行业务拦截）
    const existing = await manager.findOne(Tenant, { where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`企业编码 ${dto.code} 已被占用`);
    }

    const tenant = manager.create(Tenant, {
      code: dto.code, // <--- 传入新字段
      name: dto.name,
      industry: dto.industry || 'heating_element',
      contactPerson: dto.contactPerson, // <--- 传入新字段
      contactPhone: dto.contactPhone, // <--- 传入新字段
    });

    return await manager.save(tenant);
  }
  /**
   * 优化后的逻辑拆分 3：初始化角色（极致性能版）
   */
  private async initTenantRoles(manager: EntityManager, tenantId: string) {
    let adminRole: Role;

    // 1. 一次性获取所有非管理员角色需要的权限 Code
    const allRequiredCodes = Object.values(ROLE_TEMPLATES)
      .filter((t) => t.code !== 'ADMIN')
      .flatMap((t) => t.permissionCodes);

    // 2. 一次性查出所有权限实体
    const allPerms =
      allRequiredCodes.length > 0
        ? await manager.find(Permission, { where: { code: In(allRequiredCodes) } })
        : [];

    // 3. 循环创建角色（此时已无数据库查询）
    for (const tpl of Object.values(ROLE_TEMPLATES)) {
      const isSuperAdmin = tpl.code === 'ADMIN';

      // 从已查出的列表中筛选
      const perms = isSuperAdmin
        ? []
        : allPerms.filter((p) => (tpl.permissionCodes as any).includes(p.code));
      const role = manager.create(Role, {
        tenantId,
        name: tpl.name,
        code: tpl.code,
        isSystem: true,
        permissions: perms,
      });

      const savedRole = await manager.save(role);
      if (isSuperAdmin) adminRole = savedRole;
    }

    return { adminRole };
  }
  /**
   * 逻辑拆分 4：创建管理员
   */
  private async createAdminUser(
    manager: EntityManager,
    tenantId: string,
    dto: CreateTenantDto,
    role: Role,
  ) {
    const hashedPassword = await bcrypt.hash(dto.adminPass, 10);
    const user = manager.create(User, {
      tenantId,
      username: dto.adminUser,
      password: hashedPassword,
      nickname: '系统管理员',
      roles: [role],
    });
    return await manager.save(user);
  }
}
