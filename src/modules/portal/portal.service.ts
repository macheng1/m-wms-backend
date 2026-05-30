// src/modules/portal/portal.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';

import { Category } from '../product/entities/category.entity';

import { PortalConfig } from './entities/portal-config.entity';
import { Inquiry } from './entities/inquiry.entity';
import { PortalJob } from './entities/portal-job.entity';
import { Product } from '../product/product.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { QueryPortalJobDto, SavePortalJobDto } from './dto/portal-job.dto';
import { BusinessException } from '@/common/filters/business.exception';
import { NotificationsService } from '../notifications/services/notifications.service';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from '../notifications/interfaces/notification-type.enum';

@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(PortalConfig) private configRepo: Repository<PortalConfig>,
    @InjectRepository(Inquiry) private inquiryRepo: Repository<Inquiry>,
    @InjectRepository(PortalJob) private jobRepo: Repository<PortalJob>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 💡 核心辅助：通过域名/编码获取租户并验证
   */
  private async getTenantByDomain(domain: string) {
    // 兼容处理：转大写、去除空格，并将 - 替换为 _
    const code = domain.trim().toUpperCase().replace(/-/g, '_');
    const tenant = await this.tenantRepo.findOne({
      where: { code },
    });

    if (!tenant) throw new NotFoundException('该工厂门户不存在');
    return tenant;
  }

  // --- 面向访客的公开接口 ---

  async getPortalInitData(domain: string) {
    // 1. 获取租户基础信息
    const tenant = await this.getTenantByDomain(domain);
    if (!tenant) {
      throw new NotFoundException('未找到该门户站点');
    }

    // 2. 并行查询配置信息和带产品的类目信息
    const [config, categories, jobs] = await Promise.all([
      this.configRepo.findOne({ where: { tenantId: tenant.id, isActive: 1 } }),
      this.categoryRepo.find({
        where: [
          { tenantId: tenant.id, isActive: 1 },
          { tenantId: IsNull(), isActive: 1 },
        ],
        relations: ['products', 'attributes'],
        order: { tenantId: 'ASC', createdAt: 'ASC' },
      }),
      this.jobRepo.find({
        where: { tenantId: tenant.id, isActive: 1 },
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
      }),
    ]);

    // 3. 准备快捷变量
    const footerInfo = config?.footerInfo || {};
    const seoConfig = config?.seoConfig || {};
    const displayContactPerson = footerInfo.contactPerson || tenant.contactPerson || '业务部';
    const displayPhone = footerInfo.phone || tenant.contactPhone || '请完善联系电话';
    const displayAddress =
      footerInfo.address || tenant.factoryAddress || tenant.address || '请完善工厂地址';

    // 4. 核心：转换动态规格的产品列表
    const formattedProducts = categories
      .map((cat) => {
        const attributes = cat.attributes || [];
        const formatSpecEntries = (rawSpecs: Record<string, any>) =>
          Object.entries(rawSpecs || {}).map(([key, value]) => {
            const attr = attributes.find((item) => item.code === key || item.name === key);
            return {
              label: attr?.name || key,
              code: key,
              value: String(value),
            };
          });

        return {
          categoryName: cat.name,
          categoryEn: cat.code, // 使用类目编码作为英文名/标识
          items: (cat.products || [])
            .filter((p) => p.tenantId === tenant.id && p.isActive === 1)
            .map((p) => {
              const rawSpecs = p.specs || {};
              const formattedSpecs = formatSpecEntries(rawSpecs);
              const materialSpec =
                formattedSpecs.find((item) => item.label.includes('材质')) || formattedSpecs[0];
              const mainSpec =
                formattedSpecs.find((item) => item.label.includes('规格')) ||
                formattedSpecs.find((item) => item.label.includes('长度')) ||
                formattedSpecs[1];

              return {
                id: p.id,
                name: p.name,
                code: p.code,
                // 兼容性字段：卡片主展示
                material: materialSpec?.value || '-',
                diameter: mainSpec ? `${mainSpec.label}: ${mainSpec.value}` : '-',
                // 全量动态规格
                allSpecs: formattedSpecs,
                image: p.images?.[0] || '', // 取首图
                isPublic: true,
              };
            }),
        };
      })
      .filter((cat) => cat.items.length > 0);

    // 5. 按照要求的格式组装全量数据
    return {
      // --- 1. 基础全局信息 ---
      name: config?.title || tenant.name,
      tenantName: tenant.name,
      code: tenant.code,
      contactPerson: displayContactPerson,
      phone: displayPhone,
      address: displayAddress,
      intro: config?.description || '深耕制造业，提供高品质工业解决方案。',
      slogan: config?.slogan || '赋能制造律动，链接工业未来',
      website: tenant.website || '',
      businessInfo: {
        foundDate: tenant.foundDate,
        staffCount: tenant.staffCount,
        mainProducts: tenant.mainProducts,
        annualCapacity: tenant.annualCapacity,
        industryType: tenant.industryType,
      },
      seo: seoConfig,

      // --- 2. 导航栏配置 ---
      navbar: {
        logo: config?.logo,
        logoHref: `/portal/${domain}/zh`,
        showLogin: true,
        menuItems: [
          { label: '首页', href: `/portal/${domain}/zh` },
          { label: '产品中心', href: `/portal/${domain}/zh/products` },
          { label: '招聘', href: `/portal/${domain}/zh/jobs` },
          { label: '联系我们', href: `/portal/${domain}/zh/contact` },
        ],
        className: 'portal-header-custom',
      },

      // --- 3. 产品中心数据 (已分组并处理规格) ---
      products: formattedProducts,

      // --- 4. 业务扩展模块 (暂给默认值) ---
      jobs,
      posts: [],

      // --- 5. 页脚配置 ---
      footer: {
        title: tenant.name,
        linkList: [
          {
            title: '快捷导航',
            list: [
              { label: '产品中心', link: `/portal/${domain}/zh/products` },
              { label: '招聘', link: `/portal/${domain}/zh/jobs` },
              { label: '官方首页', link: `/portal/${domain}/zh` },
            ],
          },
          {
            title: '联系我们',
            list: [
              { label: `电话：${displayPhone}`, link: `tel:${displayPhone}` },
              { label: `地址：${displayAddress}` },
            ],
          },
        ],
        qrCode: {
          image: footerInfo.qrCode || 'https://oss.pinmalink.com/default-qrcode.png',
          text: '微信扫码联系工厂',
        },
        copyRight: footerInfo.copyright || `© ${new Date().getFullYear()} ${tenant.name} 版权所有`,
        siteNumber: footerInfo.icp || '备案号申请中',
        publicNumber: footerInfo.publicNumber || '',
      },
    };
  }

  /**
   * 获取产品详情
   */
  async getProductDetail(domain: string, productId: string) {
    const tenant = await this.getTenantByDomain(domain);
    const product = await this.productRepo.findOne({
      where: { id: productId, tenantId: tenant.id, isActive: 1 },
      relations: ['category', 'category.attributes'],
    });
    if (!product) throw new NotFoundException('产品信息不存在');
    const attributes = product.category?.attributes || [];
    const specs = Object.entries(product.specs || {}).reduce(
      (result, [key, value]) => {
        const attr = attributes.find((item) => item.code === key || item.name === key);
        result[attr?.name || key] = value;
        return result;
      },
      {} as Record<string, any>,
    );

    return {
      ...product,
      specs,
    };
  }

  /**
   * 提交询盘
   */
  async submitInquiry(domain: string, data: any) {
    const tenant = await this.getTenantByDomain(domain);

    // 保存询价记录
    const inquiry = this.inquiryRepo.create({ ...data, tenantId: tenant.id });
    const savedInquiries = await this.inquiryRepo.save(inquiry);
    const savedInquiry = Array.isArray(savedInquiries) ? savedInquiries[0] : savedInquiries;

    // 发送实时通知给客服（广播给租户所有在线用户）
    // TODO: 可以根据租户配置指定接收通知的用户ID列表
    try {
      await this.notificationsService.send({
        tenantId: tenant.id,
        type: NotificationType.MESSAGE,
        category: NotificationCategory.CONSULTATION,
        title: `新询价 - ${data.name}`,
        message: `收到来自${data.company || data.name}的询价：${data.message || '请查看详情'}`,
        data: {
          inquiryId: savedInquiry.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          company: data.company,
          message: data.message,
          productInterest: data.productInterest,
          source: '官网',
          submittedAt: new Date().toISOString(),
        },
        priority: NotificationPriority.HIGH,
      });
    } catch (error) {
      console.error('发送询价通知失败:', error);
      // 不影响询价保存，只记录错误
    }

    return savedInquiry;
  }

  /**
   * 更新网站配置
   */
  async updateConfig(tenantId: string, updateDto: Partial<PortalConfig>): Promise<PortalConfig> {
    let config = await this.configRepo.findOne({ where: { tenantId } });

    if (!config) {
      config = this.configRepo.create({
        tenantId,
        ...updateDto,
      });
    } else {
      Object.assign(config, updateDto);
    }

    return await this.configRepo.save(config);
  }

  /**
   * 获取询盘列表（分页+条件）
   * @param tenantId 租户ID
   * @param page 页码（默认1）
   * @param pageSize 每页数量（默认20）
   * @param filters 查询条件
   */
  async getInquiries(
    tenantId: string,
    page = 1,
    pageSize = 20,
    filters?: {
      name?: string;
      status?: string;
    },
  ) {
    const qb = this.inquiryRepo
      .createQueryBuilder('inquiry')
      .where('inquiry.tenantId = :tenantId', { tenantId });

    if (filters?.name) {
      qb.andWhere('inquiry.name LIKE :name', { name: `%${filters.name}%` });
    }
    if (filters?.status && filters.status !== 'all') {
      qb.andWhere('inquiry.status = :status', { status: filters.status });
    }

    qb.orderBy('inquiry.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getInquiryDetail(tenantId: string, id: string) {
    const inquiry = await this.inquiryRepo.findOne({ where: { id, tenantId } });
    if (!inquiry) throw new BusinessException('询盘不存在');
    return inquiry;
  }

  async updateInquiryStatus(tenantId: string, id: string, status: 'unread' | 'read' | 'replied') {
    const inquiry = await this.getInquiryDetail(tenantId, id);
    inquiry.status = status;
    return this.inquiryRepo.save(inquiry);
  }

  async updateInquiryRemark(tenantId: string, id: string, adminRemark: string) {
    const inquiry = await this.getInquiryDetail(tenantId, id);
    inquiry.adminRemark = adminRemark;
    return this.inquiryRepo.save(inquiry);
  }

  async getJobs(tenantId: string, query: QueryPortalJobDto = {}) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const where: any = { tenantId };
    if (query.position) where.position = Like(`%${query.position}%`);
    if (query.isActive !== undefined && Number(query.isActive) !== -1) {
      where.isActive = Number(query.isActive);
    }

    const [list, total] = await this.jobRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    return { list, total, page, pageSize };
  }

  async getJobDetail(tenantId: string, id: string) {
    const job = await this.jobRepo.findOne({ where: { id, tenantId } });
    if (!job) throw new BusinessException('招聘职位不存在');
    return job;
  }

  async saveJob(tenantId: string, dto: SavePortalJobDto) {
    const payload = {
      ...dto,
      tenantId,
      count: Number(dto.count || 1),
      sortOrder: Number(dto.sortOrder || 0),
      isActive: Number(dto.isActive ?? 1),
    };

    if (dto.id) {
      const job = await this.getJobDetail(tenantId, dto.id);
      Object.assign(job, payload);
      return this.jobRepo.save(job);
    }

    return this.jobRepo.save(this.jobRepo.create(payload));
  }

  async deleteJob(tenantId: string, id: string) {
    await this.getJobDetail(tenantId, id);
    await this.jobRepo.delete({ id, tenantId });
    return { message: '删除成功' };
  }
}
