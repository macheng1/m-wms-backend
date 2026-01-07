// src/modules/tenants/services/tenants.service.ts
import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ROLE_TEMPLATES } from '@/common/constants/role-templates.constant';
import { flattenPermissions } from '@/common/constants/permissions.constant';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { User } from '../users/entities/user.entity';
import pinyin from 'pinyin';
import { DictionariesService } from '../system/service/dictionaries.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly dictionariesService: DictionariesService,
  ) {}

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
          tenantCode: tenant.code,
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
   * 分页查询租户列表
   */
  async findAll({ page = 1, pageSize = 20 }: { page: number; pageSize: number }) {
    const repo = this.dataSource.getRepository(Tenant);
    const [data, total] = await repo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取租户详情
   */
  async findOne(id: string) {
    const repo = this.dataSource.getRepository(Tenant);
    const tenant = await repo.findOne({ where: { id } });
    if (!tenant) throw new ConflictException('租户不存在');
    // 查行业名称
    let industryName = '';
    if (tenant.industryCode) {
      const dict = await this.dictionariesService.getOptionsByType('INDUSTRY', tenant.id);
      const found = dict.find((item) => item.value === tenant.industryCode);
      industryName = found ? found.label : '';
    }
    // 返回所有业务字段，保证前端展示完整
    return {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      industryCode: tenant.industryCode,
      industryName,
      contactPerson: tenant.contactPerson,
      contactPhone: tenant.contactPhone,
      address: tenant.address,
      factoryAddress: tenant.factoryAddress,
      registerAddress: tenant.registerAddress,
      website: tenant.website,
      remark: tenant.remark,
      taxNo: tenant.taxNo,
      taxpayerType: tenant.taxpayerType,
      creditCode: tenant.creditCode,
      bankName: tenant.bankName,
      bankAccount: tenant.bankAccount,
      businessLicenseNo: tenant.businessLicenseNo,
      businessLicenseExpire: tenant.businessLicenseExpire,
      legalPerson: tenant.legalPerson,
      registeredCapital: tenant.registeredCapital,
      industryType: tenant.industryType,
      qualificationNo: tenant.qualificationNo,
      qualificationExpire: tenant.qualificationExpire,
      email: tenant.email,
      fax: tenant.fax,
      foundDate: tenant.foundDate,
      staffCount: tenant.staffCount,
      mainProducts: tenant.mainProducts,
      annualCapacity: tenant.annualCapacity,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * 修改租户信息
   */
  async update(id: string, updateTenantDto: Partial<Tenant>) {
    const repo = this.dataSource.getRepository(Tenant);
    const tenant = await repo.findOne({ where: { id } });
    if (!tenant) throw new ConflictException('租户不存在');
    // 只允许更新白名单字段，防止脏数据
    const allowFields = [
      'name',
      'industry',
      'contactPerson',
      'contactPhone',
      'address',
      'factoryAddress',
      'registerAddress',
      'website',
      'remark',
      'taxNo',
      'taxpayerType',
      'creditCode',
      'bankName',
      'bankAccount',
      'businessLicenseNo',
      'businessLicenseExpire',
      'legalPerson',
      'registeredCapital',
      'industryType',
      'qualificationNo',
      'qualificationExpire',
      'email',
      'fax',
      'foundDate',
      'staffCount',
      'mainProducts',
      'annualCapacity',
      'isActive',
    ];
    for (const key of allowFields) {
      if (key in updateTenantDto) {
        tenant[key] = updateTenantDto[key];
      }
    }
    return await repo.save(tenant);
  }
  private generateEnterpriseCode(enterpriseName: string): string {
    // 1. 提取企业名称简拼
    const initials =
      pinyin(enterpriseName, { style: pinyin.STYLE_FIRST_LETTER })
        .map((arr) => arr[0]?.toUpperCase() || '')
        .join('') || 'ORG'; // 如果提取失败，默认使用 ORG

    // 2. 生成 4 位大写随机码 (排除 0, O, 1, I 等易混淆字符)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let random = '';
    for (let i = 0; i < 4; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 3. 组合返回
    return `ENT_${initials}_${random}`;
  }
  /**
   * 删除租户
   */
  async remove(id: string) {
    const repo = this.dataSource.getRepository(Tenant);
    const tenant = await repo.findOne({ where: { id } });
    if (!tenant) throw new ConflictException('租户不存在');
    await repo.remove(tenant);
    return { success: true };
  }
  /**
   * 优化后的逻辑拆分 1：预校验（包含用户名和企业编码）
   */
  private async validateBeforeOnboard(dto: CreateTenantDto) {
    // 并行检查用户名和企业编码，提升效率
    const [existingUser] = await Promise.all([
      this.dataSource.getRepository(User).findOne({ where: { username: dto.adminUser } }),
    ]);

    if (existingUser) {
      throw new ConflictException(`用户名 ${dto.adminUser} 已被占用`);
    }
  }
  /**
   * 逻辑拆分 2：创建租户
   */
  private async createTenant(manager: EntityManager, dto: CreateTenantDto): Promise<Tenant> {
    // 自动生成 code（企业编码）
    let code = dto.code;
    if (!code) {
      code = this.generateEnterpriseCode(dto.name);
    }
    // 检查 code 是否已存在（防止数据库报错前先进行业务拦截）
    const existing = await manager.findOne(Tenant, { where: { code } });
    if (existing) {
      throw new ConflictException(`企业编码 ${code} 已被占用`);
    }
    // 自动映射所有 dto 字段到 Tenant
    const tenant = manager.create(Tenant, {
      ...dto,
      code,
      industry: dto.industry || 'heating_element',
    });
    return await manager.save(tenant);
  }
  /**
   * 优化后的逻辑拆分 3：初始化角色（极致性能版）
   */
  private async initTenantRoles(manager: EntityManager, tenantId: string) {
    let adminRole: Role;

    // 1. 获取所有权限（直接用常量，保证和菜单一致）
    const allPermissions = flattenPermissions();

    // 2. 循环创建角色
    for (const tpl of Object.values(ROLE_TEMPLATES)) {
      const isSuperAdmin = tpl.code === 'ADMIN';
      // admin 角色分配所有权限，其他角色按模板分配
      const perms = isSuperAdmin
        ? allPermissions
        : allPermissions.filter((p) => (tpl.permissionCodes as any).includes(p.code));
      console.log('🚀 ~ TenantsService ~ initTenantRoles ~ perms:', perms);
      // 注意：这里只是用常量生成权限对象，实际入库时仍需用 Permission 实体
      // 你可以根据 code 查询 Permission 实体，或直接用 code 关联
      // 这里假设 Permission 实体已初始化，且 code 唯一
      const permissionEntities = await manager.find(Permission, {
        where: { code: In(perms.map((p) => p.code)) },
      });
      const role = manager.create(Role, {
        tenantId,
        name: tpl.name,
        code: tpl.code,
        isSystem: true,
        permissions: permissionEntities,
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
