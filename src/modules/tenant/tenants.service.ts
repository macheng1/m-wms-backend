// src/modules/tenants/services/tenants.service.ts
import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { ROLE_TEMPLATES } from '@/common/constants/role-templates.constant';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { Role } from '../roles/entities/role.entity';
import { Menu } from '../auth/entities/menu.entity';
import { User } from '../users/entities/user.entity';
import pinyin from 'pinyin';
import { PortalConfig } from '../portal/entities/portal-config.entity';
import { SmsService } from '../aliyun/sms/sms.service';
import { BusinessException } from '@/common/filters/business.exception';
import { Dictionary } from '../system/entities/dictionary.entity';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 核心业务：租户入驻全自动化流程
   */
  async onboard(dto: CreateTenantDto) {
    const normalizedDto = this.normalizeOnboardDto(dto);
    this.validateRequiredOnboardFields(normalizedDto);

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        await this.validateBeforeOnboard(manager, normalizedDto);
        const tenant = await this.createTenant(manager, normalizedDto);
        const menuGrantCount = await this.initTenantMenuPermissions(manager, tenant.id);
        const { adminRole, roleCount } = await this.initTenantRoles(manager, tenant.id);
        const adminUser = await this.createAdminUser(manager, tenant.id, normalizedDto, adminRole);
        await this.initPortalConfig(manager, tenant);

        return {
          tenantId: tenant.id,
          tenantCode: tenant.code,
          tenantName: tenant.name,
          adminId: adminUser.id,
          username: adminUser.username,
          menuGrantCount,
          roleCount,
        };
      });

      // 2. 入驻成功后删除验证码（防止重复使用）
      await this.smsService.deleteCode(normalizedDto.contactPhone);

      return result;
    } catch (error) {
      this.logger.error(`租户入驻失败: ${error.message}`, error.stack);
      // 如果是已知的业务异常则直接抛出，否则封装为 500
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('系统在处理租户入驻时发生未知错误');
    }
  }

  async onboardFromMiniapp(dto: CreateTenantDto) {
    const normalizedDto = this.normalizeOnboardDto({
      ...dto,
      tenantSource: 'miniapp',
      smsCode: dto.smsCode || 'MINIAPP_AUTHORIZED_PHONE',
      adminUser: dto.adminUser || dto.contactPhone,
      adminPass: dto.adminPass || this.generateInitialPassword(),
      email: dto.email || `${dto.contactPhone || Date.now()}@miniapp.local`,
    });

    if (!normalizedDto.name) throw new BadRequestException('企业名称不能为空');
    if (!normalizedDto.contactPhone) throw new BadRequestException('联系电话不能为空');
    if (!normalizedDto.adminUser) throw new BadRequestException('管理员账号不能为空');
    if (!normalizedDto.adminPass) throw new BadRequestException('管理员密码不能为空');

    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.validateTenantUniqueBeforeOnboard(manager, normalizedDto);
        const tenant = await this.createTenant(manager, normalizedDto);
        const menuGrantCount = await this.initTenantMenuPermissions(manager, tenant.id);
        const { adminRole, roleCount } = await this.initTenantRoles(manager, tenant.id);
        const adminUser = await this.createAdminUser(manager, tenant.id, normalizedDto, adminRole);
        await this.initPortalConfig(manager, tenant);

        return {
          tenantId: tenant.id,
          tenantCode: tenant.code,
          tenantName: tenant.name,
          adminId: adminUser.id,
          username: adminUser.username,
          menuGrantCount,
          roleCount,
        };
      });
    } catch (error) {
      this.logger.error(`小程序租户入驻失败: ${error.message}`, error.stack);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('系统在处理小程序企业认证时发生未知错误');
    }
  }

  /**
   * 分页查询租户列表
   */
  async findAll({
    page = 1,
    pageSize = 20,
    code,
    name,
    contactPerson,
    contactPhone,
    email,
    tenantSource,
    lifecycleStatus,
    isActive,
  }: {
    page: number;
    pageSize: number;
    code?: string;
    name?: string;
    contactPerson?: string;
    contactPhone?: string;
    email?: string;
    tenantSource?: 'platform' | 'miniapp' | 'import' | 'api' | 'all';
    lifecycleStatus?: 'pending' | 'active' | 'rejected' | 'disabled' | 'expired';
    isActive?: number | string;
  }) {
    const repo = this.dataSource.getRepository(Tenant);
    const where: any = {};

    // 文本类查询统一走模糊匹配（LIKE %x%）
    if (code) where.code = Like(`%${code}%`);
    if (name) where.name = Like(`%${name}%`);
    if (contactPerson) where.contactPerson = Like(`%${contactPerson}%`);
    if (contactPhone) where.contactPhone = Like(`%${contactPhone}%`);
    if (email) where.email = Like(`%${email}%`);
    if (tenantSource && tenantSource !== 'all') where.tenantSource = tenantSource;
    if (lifecycleStatus) where.lifecycleStatus = lifecycleStatus;

    const activeValue = Number(isActive);
    if (activeValue === 0 || activeValue === 1) {
      where.isActive = activeValue;
    }

    const [list, total] = await repo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
    });
    const industryNameMap = await this.getIndustryNameMap();
    return {
      list: list.map((tenant) => this.serializeTenant(tenant, industryNameMap)),
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
    const industryName = await this.resolveIndustryName(tenant.industryCode);

    // 返回所有业务字段，保证前端展示完整
    return {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      tenantSource: tenant.tenantSource,
      industryCode: tenant.industryCode,
      industryName,
      contactPerson: tenant.contactPerson,
      contactPhone: tenant.contactPhone,
      address: tenant.address,
      factoryAddress: tenant.factoryAddress,
      registerAddress: tenant.registerAddress,
      website: tenant.website,
      remark: tenant.remark,
      businessLicenseImage: this.extractMiniappBusinessLicenseImage(tenant.remark),
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
      isApproved: tenant.isApproved,
      lifecycleStatus: tenant.lifecycleStatus,
      expiresAt: tenant.expiresAt,
      approvedAt: tenant.approvedAt,
      auditRemark: tenant.auditRemark,
      disabledReason: tenant.disabledReason,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  async findPublicAll(query: {
    page: number;
    pageSize: number;
    tenantSource?: 'platform' | 'miniapp' | 'import' | 'api' | 'all';
    name?: string;
  }) {
    const result = await this.findAll({
      ...query,
      lifecycleStatus: 'active',
      isActive: 1,
    });

    return {
      ...result,
      list: result.list.map((tenant) => this.toPublicTenant(tenant)),
    };
  }

  async findPublicOne(id: string) {
    const tenant = await this.findOne(id);
    if (tenant.isActive !== 1 || tenant.lifecycleStatus !== 'active') {
      throw new BusinessException('企业暂未开放展示');
    }
    return this.toPublicTenant(tenant);
  }

  async approve(id: string) {
    const repo = this.dataSource.getRepository(Tenant);
    const tenant = await repo.findOne({ where: { id } });
    if (!tenant) throw new ConflictException('租户不存在');

    tenant.isApproved = 1;
    tenant.isActive = 1;
    tenant.lifecycleStatus = 'active';
    tenant.approvedAt = tenant.approvedAt || new Date();
    const savedTenant = await repo.save(tenant);
    await this.syncMiniappTenantBindStatus(savedTenant.id, 'approved');

    return {
      id: savedTenant.id,
      code: savedTenant.code,
      name: savedTenant.name,
      isApproved: savedTenant.isApproved,
      isActive: savedTenant.isActive,
      lifecycleStatus: savedTenant.lifecycleStatus,
      message: '租户审核已通过',
    };
  }

  private toPublicTenant(tenant: any) {
    return {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      tenantSource: tenant.tenantSource,
      industryCode: tenant.industryCode,
      industryName: tenant.industryName || tenant.industryType || null,
      contactPerson: tenant.contactPerson,
      contactPhone: tenant.contactPhone,
      address: tenant.address || tenant.factoryAddress || null,
      website: tenant.website,
      mainProducts: tenant.mainProducts,
      annualCapacity: tenant.annualCapacity,
      foundDate: tenant.foundDate,
      staffCount: tenant.staffCount,
      isActive: tenant.isActive,
      lifecycleStatus: tenant.lifecycleStatus,
      createdAt: tenant.createdAt,
    };
  }

  async reject(id: string, auditRemark?: string) {
    const repo = this.dataSource.getRepository(Tenant);
    const tenant = await repo.findOne({ where: { id } });
    if (!tenant) throw new ConflictException('租户不存在');

    tenant.isApproved = 0;
    tenant.isActive = 0;
    tenant.lifecycleStatus = 'rejected';
    tenant.auditRemark = auditRemark || tenant.auditRemark || '入驻申请未通过审核';
    const savedTenant = await repo.save(tenant);
    await this.syncMiniappTenantBindStatus(savedTenant.id, 'rejected', savedTenant.auditRemark);

    return {
      id: savedTenant.id,
      code: savedTenant.code,
      name: savedTenant.name,
      isApproved: savedTenant.isApproved,
      isActive: savedTenant.isActive,
      lifecycleStatus: savedTenant.lifecycleStatus,
      message: '租户已驳回并禁用',
    };
  }

  async resubmitMiniappTenant(id: string, dto: CreateTenantDto) {
    const repo = this.dataSource.getRepository(Tenant);
    const tenant = await repo.findOne({ where: { id } });
    if (!tenant) throw new ConflictException('租户不存在');
    if (tenant.tenantSource !== 'miniapp')
      throw new BusinessException('仅小程序认证企业支持重新提交');
    if (!['active', 'rejected'].includes(tenant.lifecycleStatus)) {
      throw new BusinessException('当前企业认证状态不支持重新提交');
    }

    const normalizedDto = this.normalizeOnboardDto({
      ...dto,
      tenantSource: 'miniapp',
      code: tenant.code,
      smsCode: dto.smsCode || 'MINIAPP_AUTHORIZED_PHONE',
      adminUser: dto.adminUser || dto.contactPhone,
      adminPass: dto.adminPass || this.generateInitialPassword(),
      email: dto.email || tenant.email || `${dto.contactPhone || Date.now()}@miniapp.local`,
    });

    if (!normalizedDto.name) throw new BadRequestException('企业名称不能为空');
    if (!normalizedDto.contactPhone) throw new BadRequestException('联系电话不能为空');

    const existingTenant = await repo.findOne({ where: { name: normalizedDto.name } });
    if (existingTenant && existingTenant.id !== id) {
      throw new BusinessException(`企业 "${normalizedDto.name}" 已存在`);
    }

    Object.assign(tenant, {
      name: normalizedDto.name,
      contactPhone: normalizedDto.contactPhone,
      contactPerson: normalizedDto.contactPerson,
      address: normalizedDto.address || null,
      factoryAddress: normalizedDto.factoryAddress || normalizedDto.address || null,
      registerAddress: normalizedDto.registerAddress || normalizedDto.address || null,
      creditCode: normalizedDto.creditCode || null,
      taxNo: normalizedDto.taxNo || normalizedDto.creditCode || null,
      businessLicenseNo: normalizedDto.businessLicenseNo || normalizedDto.creditCode || null,
      legalPerson: normalizedDto.legalPerson || normalizedDto.contactPerson || null,
      mainProducts: normalizedDto.mainProducts || null,
      remark: normalizedDto.remark || tenant.remark || null,
      auditRemark: null,
      disabledReason: null,
      isApproved: 0,
      isActive: 0,
      lifecycleStatus: 'pending',
      tenantSource: 'miniapp',
    });

    const savedTenant = await repo.save(tenant);
    await this.syncMiniappTenantBindStatus(savedTenant.id, 'pending');

    return {
      tenantId: savedTenant.id,
      tenantCode: savedTenant.code,
      tenantName: savedTenant.name,
      username: normalizedDto.adminUser,
      message: '企业认证已重新提交',
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
        'tenantSource',
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
        // 注意：isActive / isApproved / lifecycleStatus 不在白名单内。
        // 租户启停/审批是单一真相 lifecycleStatus，必须走 /admin/platform/tenants/:id/lifecycle，
        // 由 updateTenantLifecycle 同步三字段，避免"改了 isActive 却和 lifecycleStatus 脱节"。
      ];
      for (const key of allowFields) {
        if (key in updateTenantDto) {
          // 特殊处理 Date 类型字段
          if (
            key === 'foundDate' ||
            key === 'businessLicenseExpire' ||
            key === 'qualificationExpire'
          ) {
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
      if ('industryCode' in updateTenantDto && !('industryType' in updateTenantDto)) {
        const industryName = await this.resolveIndustryName(updateTenantDto.industryCode, manager);
        tenant.industryType = industryName || null;
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

  private generateInitialPassword(): string {
    return `Mws${Math.random().toString(36).slice(2, 8)}`;
  }

  private normalizeOnboardDto(dto: CreateTenantDto): CreateTenantDto {
    return {
      ...dto,
      code: dto.code?.trim(),
      name: dto.name?.trim(),
      tenantSource: dto.tenantSource || 'platform',
      contactPhone: dto.contactPhone?.trim(),
      contactPerson: dto.contactPerson?.trim(),
      email: dto.email?.trim(),
      adminUser: dto.adminUser?.trim(),
      industryCode: dto.industryCode?.trim(),
      industryName: dto.industryName?.trim(),
      industryType: dto.industryType?.trim(),
    };
  }

  private validateRequiredOnboardFields(dto: CreateTenantDto) {
    if (!dto.name) throw new BadRequestException('企业名称不能为空');
    if (!dto.contactPhone) throw new BadRequestException('联系电话不能为空');
    if (!dto.email) throw new BadRequestException('联系邮箱不能为空');
    if (!dto.smsCode) throw new BadRequestException('验证码不能为空');
    if (!dto.adminUser) throw new BadRequestException('管理员账号不能为空');
    if (!dto.adminPass) throw new BadRequestException('管理员密码不能为空');
  }
  /**
   * 删除租户
   */
  async remove(id: string) {
    const repo = this.dataSource.getRepository(Tenant);
    const tenant = await repo.findOne({ where: { id } });
    if (!tenant) throw new ConflictException('租户不存在');

    // 必须先停用再删除：避免在职客户被误删、名下数据(用户/库存/订单…)成孤儿
    if (tenant.isActive === 1 && tenant.lifecycleStatus === 'active') {
      throw new BadRequestException('请先停用该租户，再执行删除');
    }

    // 软删除：标记 deletedAt（基类 @DeleteDateColumn），数据保留可追溯/可恢复，不物理清除
    tenant.lifecycleStatus = 'disabled';
    tenant.isActive = 0;
    await repo.save(tenant);
    await repo.softDelete(id);
    return { success: true };
  }
  /**
   * 优化后的逻辑拆分 1：预校验（手机验证码、企业全称）
   */
  private async validateBeforeOnboard(manager: EntityManager, dto: CreateTenantDto) {
    // 1. 验证手机验证码
    const isValidCode = await this.smsService.verifyCode(dto.contactPhone, dto.smsCode);
    if (!isValidCode) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 2. 检查企业全称是否已存在
    const tenantRepo = manager.getRepository(Tenant);
    const existingTenant = await tenantRepo.findOne({
      where: { name: dto.name },
    });
    if (existingTenant) {
      throw new BusinessException(`企业 "${dto.name}" 已存在`);
    }

    if (dto.code) {
      const existingCode = await tenantRepo.findOne({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new BusinessException(`企业编码 "${dto.code}" 已存在`);
      }
    }
  }

  private async validateTenantUniqueBeforeOnboard(manager: EntityManager, dto: CreateTenantDto) {
    const tenantRepo = manager.getRepository(Tenant);
    const existingTenant = await tenantRepo.findOne({
      where: { name: dto.name },
    });
    if (existingTenant) {
      throw new BusinessException(`企业 "${dto.name}" 已存在`);
    }

    if (dto.code) {
      const existingCode = await tenantRepo.findOne({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new BusinessException(`企业编码 "${dto.code}" 已存在`);
      }
    }
  }

  private async syncMiniappTenantBindStatus(
    tenantId: string,
    status: 'pending' | 'approved' | 'rejected',
    remark?: string,
  ) {
    await this.dataSource.query(
      `UPDATE miniapp_members
       SET tenantBindStatus = ?, tenantBindRemark = ?
       WHERE tenantId = ?`,
      [status, remark || null, tenantId],
    );
  }

  private extractMiniappBusinessLicenseImage(remark?: string | null) {
    const prefix = '小程序营业执照：';
    if (!remark?.startsWith(prefix)) return '';
    return remark.slice(prefix.length).trim();
  }

  private async createTenant(manager: EntityManager, dto: CreateTenantDto): Promise<Tenant> {
    // 1. 生成企业编码和官网链接
    const code = dto.code || (await this.generateUniqueEnterpriseCode(manager, dto.name));

    // 2. 统一生成官网地址（不再区分环境）
    const baseDomain =
      this.configService.get<string>('app.portalDomain') || 'https://pinmalink.com';
    const urlSlug = code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const website = `${baseDomain}/portal/${urlSlug}/zh`;
    const industryName = await this.resolveIndustryName(dto.industryCode, manager);

    // 3. 创建并保存租户
    const tenant = manager.create(Tenant, {
      ...dto,
      code: code.trim(),
      website,
      industryType: dto.industryType || dto.industryName || industryName || '未分类',
      tenantSource: dto.tenantSource || 'platform',
      isApproved: 0,
      isActive: 0,
      lifecycleStatus: 'pending',
    });
    return await manager.save(tenant);
  }

  private serializeTenant(tenant: Tenant, industryNameMap: Map<string, string>) {
    const industryName = tenant.industryCode ? industryNameMap.get(tenant.industryCode) || '' : '';
    return {
      ...tenant,
      industryName,
      industryType: tenant.industryType || industryName || '未分类',
    };
  }

  private async getIndustryNameMap(manager?: EntityManager) {
    const repo = manager
      ? manager.getRepository(Dictionary)
      : this.dataSource.getRepository(Dictionary);
    const list = await repo.find({
      where: { type: 'INDUSTRY', isActive: 1, scope: 'platform', tenantId: IsNull() },
      order: { sort: 'ASC', createdAt: 'ASC' },
    });
    return new Map(list.map((item) => [item.value, item.label]));
  }

  private async resolveIndustryName(industryCode?: string | null, manager?: EntityManager) {
    if (!industryCode) return '';
    const industryNameMap = await this.getIndustryNameMap(manager);
    return industryNameMap.get(industryCode) || '';
  }

  private async generateUniqueEnterpriseCode(manager: EntityManager, enterpriseName: string) {
    for (let i = 0; i < 10; i += 1) {
      const code = this.generateEnterpriseCode(enterpriseName);
      const exists = await manager.exists(Tenant, { where: { code } });
      if (!exists) return code;
    }
    throw new InternalServerErrorException('企业编码生成失败，请稍后重试');
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

  private async initTenantMenuPermissions(manager: EntityManager, tenantId: string) {
    const tenantMenus = await manager.find(Menu, {
      where: { scope: 'tenant', type: In(['DIRECTORY', 'MENU', 'BUTTON']) },
    });

    for (const menu of tenantMenus) {
      await manager.query(
        'INSERT IGNORE INTO tenant_menu_permissions (tenantId, menuId) VALUES (?, ?)',
        [tenantId, menu.id],
      );
    }

    return tenantMenus.length;
  }

  /**
   * 优化后的逻辑拆分 3：初始化角色（极致性能版）
   */
  private async initTenantRoles(manager: EntityManager, tenantId: string) {
    let adminRole: Role;

    // 1. 角色直接关联 menus 表。管理员默认拥有当前租户域全部菜单和按钮。
    const allTenantMenus = await manager.find(Menu, {
      where: { scope: 'tenant' },
    });

    // 2. 循环创建角色
    for (const tpl of Object.values(ROLE_TEMPLATES)) {
      const isSuperAdmin = tpl.code === 'ADMIN';
      // admin 角色分配所有权限，其他角色按模板分配
      const menuEntities = isSuperAdmin
        ? allTenantMenus
        : allTenantMenus.filter((menu) => (tpl.menuCodes as readonly string[]).includes(menu.code));
      const role = manager.create(Role, {
        tenantId,
        name: tpl.name,
        code: tpl.code,
        scope: 'tenant',
        isSystem: true,
        menus: menuEntities,
      });
      const savedRole = await manager.save(role);
      if (isSuperAdmin) adminRole = savedRole;
    }

    if (!adminRole) {
      throw new InternalServerErrorException('租户管理员角色初始化失败');
    }

    return { adminRole, roleCount: Object.keys(ROLE_TEMPLATES).length };
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
      realName: '系统管理员',
      phone: dto.contactPhone,
      email: dto.email,
      isActive: 1,
      isPlatformAdmin: 0,
      roles: [role],
    });
    return await manager.save(user);
  }
}
