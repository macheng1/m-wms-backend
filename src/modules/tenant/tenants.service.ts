// src/modules/tenants/services/tenants.service.ts
import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { ROLE_TEMPLATES } from '@/common/constants/role-templates.constant';
import { flattenPermissions } from '@/common/constants/permissions.constant';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { User } from '../users/entities/user.entity';
import pinyin from 'pinyin';
import { DictionariesService } from '../system/service/dictionaries.service';
import { PortalConfig } from '../portal/entities/portal-config.entity';
import { SmsService } from '../aliyun/sms/sms.service';
import { BusinessException } from '@/common/filters/business.exception';
import { SystemSeedService } from '../auth/entities/system-init.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly dictionariesService: DictionariesService,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
    private readonly systemSeedService: SystemSeedService,
  ) {}

  /**
   * 核心业务：租户入驻全自动化流程
   */
  async onboard(dto: CreateTenantDto) {
    // 1. 预检查：在进入事务前拦截明显错误，节省数据库连接资源
    await this.validateBeforeOnboard(dto);

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        // Step A: 创建租户主体
        const tenant = await this.createTenant(manager, dto);

        // Step B: 并行初始化角色与权限（优化性能）
        const { adminRole } = await this.initTenantRoles(manager, tenant.id);

        // Step C: 创建租户超级管理员
        const adminUser = await this.createAdminUser(manager, tenant.id, dto, adminRole);

        // Step D: 初始化基础单位、产品类目和属性
        await this.systemSeedService.initBaseUnits(tenant.id);
        await this.systemSeedService.initProductCategories(tenant.id);
        await this.systemSeedService.initProductAttributes(tenant.id);

        // 返回给拦截器的数据负载
        return {
          tenantId: tenant.id,
          tenantCode: tenant.code,
          tenantName: tenant.name,
          adminId: adminUser.id,
          username: adminUser.username,
        };
      });

      // 2. 入驻成功后删除验证码（防止重复使用）
      await this.smsService.deleteCode(dto.contactPhone);

      return result;
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
    const [list, total] = await repo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return {
      list,
      total,
      page,
      pageSize,
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
      const dict = await this.dictionariesService.getOptionsByType('INDUSTRY');
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
    return await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Tenant);
      const tenant = await repo.findOne({ where: { id } });
      if (!tenant) throw new ConflictException('租户不存在');

      // 只允许更新白名单字段，防止脏数据
      const allowFields = [
        'name',
        'industryCode',
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
          // 特殊处理 Date 类型字段
          if (key === 'foundDate' || key === 'businessLicenseExpire' || key === 'qualificationExpire') {
            const value: any = updateTenantDto[key];

            // 1. 处理 null、undefined 或空字符串
            if (value === null || value === undefined || value === '') {
              tenant[key] = null;
            }
            // 2. 处理 Invalid Date 对象（由 DTO 验证管道将空字符串转换而来）
            else if (value instanceof Date && isNaN(value.getTime())) {
              tenant[key] = null;
            }
            // 3. 处理有效 Date 对象
            else if (value instanceof Date) {
              tenant[key] = value;
            }
            // 4. 处理字符串类型
            else if (typeof value === 'string') {
              const trimmed = value.trim();
              if (trimmed === '') {
                tenant[key] = null;
              } else {
                const dateObj = new Date(trimmed);
                // 验证日期有效性
                if (!isNaN(dateObj.getTime())) {
                  tenant[key] = dateObj;
                } else {
                  tenant[key] = null;
                }
              }
            }
            // 5. 其他情况，设置为 null 防止错误数据
            else {
              tenant[key] = null;
            }
          } else {
            tenant[key] = updateTenantDto[key];
          }
        }
      }
      const savedTenant = await repo.save(tenant);

      // 删除原 PortalConfig
      const portalConfigRepo = manager.getRepository(PortalConfig);
      await portalConfigRepo.delete({ tenantId: savedTenant.id });
      // 重新生成 PortalConfig
      await this.initPortalConfig(manager, savedTenant);

      return savedTenant;
    });
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
   * 优化后的逻辑拆分 1：预校验（手机验证码、企业全称）
   */
  private async validateBeforeOnboard(dto: CreateTenantDto) {
    // 1. 验证手机验证码
    const isValidCode = await this.smsService.verifyCode(dto.contactPhone, dto.smsCode);
    if (!isValidCode) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 2. 检查企业全称是否已存在
    const existingTenant = await this.dataSource.getRepository(Tenant).findOne({
      where: { name: dto.name },
    });
    if (existingTenant) {
      throw new BusinessException(`企业 "${dto.name}" 已存在`);
    }
  }

  private async createTenant(manager: EntityManager, dto: CreateTenantDto): Promise<Tenant> {
    // 1. 生成企业编码和官网链接
    const code = dto.code || this.generateEnterpriseCode(dto.name);

    // 2. 根据环境生成官网地址
    const nodeEnv = this.configService.get<string>('app.nodeEnv') || 'development';
    const baseDomain =
      this.configService.get<string>('app.portalDomain') || 'https://pinmalink.com';
    const subDomainMapping = this.configService.get<string>('app.portalSubDomain');

    let website: string;
    if (nodeEnv === 'production') {
      // 生产环境：直接使用域名 https://pinmalink.com/portal/{code}/zh
      const urlSlug = code
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      website = `${baseDomain}/portal/${urlSlug}/zh`;
    } else {
      // 其他环境：使用配置的子域名映射
      let subDomain = nodeEnv;
      if (subDomainMapping) {
        try {
          const mapping = JSON.parse(subDomainMapping);
          subDomain = mapping[nodeEnv] || nodeEnv;
        } catch {
          // 如果解析失败，使用环境名作为子域名
        }
      }

      const urlSlug = code
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      // 从 baseDomain 中提取域名部分（去掉协议）
      const domainWithoutProtocol = baseDomain.replace(/^https?:\/\//, '');
      website = `https://${subDomain}.${domainWithoutProtocol}/portal/${urlSlug}/zh`;
    }

    // 3. 创建并保存租户
    const tenant = manager.create(Tenant, {
      ...dto,
      code: code.trim(),
      website,
      industryType: dto.industryType || '未分类',
    });
    const savedTenant = await manager.save(tenant);

    // 💡 4. 自动初始化网站通用配置
    await this.initPortalConfig(manager, savedTenant);

    return savedTenant;
  }

  /**
   * 💡 初始化网站通用配置
   */
  private async initPortalConfig(manager: EntityManager, tenant: Tenant) {
    const defaultConfig = manager.create(PortalConfig, {
      tenantId: tenant.id,
      title: tenant.name, // 默认使用公司名称作为网站标题
      logo: '', // 留空，由用户后续上传
      slogan: '致力于提供最优质的产品与服务',
      description: `${tenant.name}欢迎您的访问。我们专注于行业领先的技术与解决方案。`,

      // 初始化默认页脚
      footerInfo: {
        contactPerson: tenant.contactPerson || '业务部',
        phone: tenant.contactPhone || '请完善联系电话',
        address: tenant.factoryAddress || tenant.address || '请完善工厂地址',
        icp: '苏ICP备2024067044号',
        copyright: `© ${new Date().getFullYear()} ${tenant.name}`,
      },

      // 初始化默认 SEO 设置
      seoConfig: {
        keywords: `${tenant.name}, ${tenant.industryType}, 产品中心`,
        description: `${tenant.name}官方网站，为您提供最新的产品资讯与行业动态。`,
      },

      isActive: 1, // 默认开启站点
    });
    return await manager.save(defaultConfig);
  }

  // ...existing code...
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
