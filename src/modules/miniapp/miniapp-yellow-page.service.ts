import { BusinessException } from '@/common/filters/business.exception';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/product.entity';
import { PortalConfig } from '../portal/entities/portal-config.entity';
import { PortalJob } from '../portal/entities/portal-job.entity';
import { Tenant } from '../tenant/entities/tenant.entity';

@Injectable()
export class MiniappYellowPageService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(PortalJob)
    private readonly jobRepo: Repository<PortalJob>,
    @InjectRepository(PortalConfig)
    private readonly portalConfigRepo: Repository<PortalConfig>,
  ) {}

  async findPage(query: { page?: number; pageNo?: number; pageSize?: number; keyword?: string }) {
    const page = Number(query.page || query.pageNo || 1);
    const pageSize = Number(query.pageSize || 10);
    const qb = this.tenantRepo
      .createQueryBuilder('tenant')
      .where('tenant.deletedAt IS NULL')
      .andWhere('tenant.isActive = :isActive', { isActive: 1 })
      .andWhere('tenant.isApproved = :isApproved', { isApproved: 1 })
      .andWhere('tenant.lifecycleStatus = :lifecycleStatus', { lifecycleStatus: 'active' });

    if (query.keyword) {
      qb.andWhere(
        '(tenant.name LIKE :keyword OR tenant.mainProducts LIKE :keyword OR tenant.industryType LIKE :keyword OR tenant.address LIKE :keyword OR tenant.factoryAddress LIKE :keyword)',
        { keyword: `%${query.keyword}%` },
      );
    }

    const [list, total] = await qb
      .orderBy('tenant.approvedAt', 'DESC')
      .addOrderBy('tenant.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const enrichMap = await this.getTenantYellowPageMeta(list.map((tenant) => tenant.id));

    return {
      list: list.map((tenant) => this.toTenantView(tenant, enrichMap.get(tenant.id))),
      total,
      page,
      pageNo: page,
      pageSize,
      hasNext: page * pageSize < total,
    };
  }

  async getDetail(id: string) {
    const tenant = await this.findPublicTenant(id);

    const [products, jobs, config, productCount, jobCount] = await Promise.all([
      this.productRepo.find({
        where: { tenantId: id, isActive: 1 },
        order: { createdAt: 'DESC' },
        take: 20,
        relations: ['category', 'category.attributes'],
      }),
      this.jobRepo.find({
        where: { tenantId: id, isActive: 1 },
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
        take: 20,
      }),
      this.portalConfigRepo.findOne({ where: { tenantId: id, isActive: 1 } }),
      this.productRepo.count({ where: { tenantId: id, isActive: 1 } }),
      this.jobRepo.count({ where: { tenantId: id, isActive: 1 } }),
    ]);

    return {
      ...this.toTenantView(tenant, {
        config,
        productCount,
        jobCount,
        latestProductImages: this.extractProductImages(products),
      }),
      remark: tenant.remark,
      businessLicenseImage: this.extractBusinessLicenseImage(tenant.remark),
      products: products.map((product) => this.toProductView(product)),
      jobs: jobs.map((job) => ({
        id: job.id,
        position: job.position,
        count: job.count,
        salary: job.salary,
        location: job.location,
        experience: job.experience,
        education: job.education,
        description: job.description,
        requirement: job.requirement,
      })),
    };
  }

  async getProductDetail(tenantId: string, productId: string) {
    const tenant = await this.findPublicTenant(tenantId);

    const product = await this.productRepo.findOne({
      where: { id: productId, tenantId, isActive: 1 },
      relations: ['category', 'category.attributes'],
    });
    if (!product) throw new BusinessException('产品不存在或未公开');

    const meta = await this.getTenantYellowPageMeta([tenantId]);
    const tenantView = this.toTenantView(tenant, meta.get(tenantId));

    return {
      ...this.toProductView(product),
      tenant: tenantView,
      tenantName: tenantView.name,
      contactPerson: tenantView.contactPerson,
      contactPhone: tenantView.contactPhone,
    };
  }

  private async findPublicTenant(id: string) {
    const tenant = await this.tenantRepo.findOne({
      where: {
        id,
        isActive: 1,
        isApproved: 1,
        lifecycleStatus: 'active',
      },
    });
    if (!tenant) throw new BusinessException('企业不存在或未公开');
    return tenant;
  }

  private async getTenantYellowPageMeta(tenantIds: string[]) {
    const map = new Map<
      string,
      {
        config?: PortalConfig | null;
        productCount?: number;
        jobCount?: number;
        latestProductImages?: string[];
      }
    >();
    if (tenantIds.length === 0) return map;

    const [configs, productRows, jobRows, products] = await Promise.all([
      this.portalConfigRepo
        .createQueryBuilder('config')
        .where('config.tenantId IN (:...tenantIds)', { tenantIds })
        .andWhere('config.isActive = :isActive', { isActive: 1 })
        .getMany(),
      this.productRepo
        .createQueryBuilder('product')
        .select('product.tenantId', 'tenantId')
        .addSelect('COUNT(product.id)', 'count')
        .where('product.tenantId IN (:...tenantIds)', { tenantIds })
        .andWhere('product.isActive = :isActive', { isActive: 1 })
        .groupBy('product.tenantId')
        .getRawMany<{ tenantId: string; count: string }>(),
      this.jobRepo
        .createQueryBuilder('job')
        .select('job.tenantId', 'tenantId')
        .addSelect('COUNT(job.id)', 'count')
        .where('job.tenantId IN (:...tenantIds)', { tenantIds })
        .andWhere('job.isActive = :isActive', { isActive: 1 })
        .groupBy('job.tenantId')
        .getRawMany<{ tenantId: string; count: string }>(),
      this.productRepo.find({
        where: tenantIds.map((tenantId) => ({ tenantId, isActive: 1 })),
        order: { createdAt: 'DESC' },
        take: tenantIds.length * 3,
      }),
    ]);

    tenantIds.forEach((tenantId) => map.set(tenantId, {}));
    configs.forEach((config) => {
      map.set(config.tenantId!, { ...(map.get(config.tenantId!) || {}), config });
    });
    productRows.forEach((row) => {
      map.set(row.tenantId, { ...(map.get(row.tenantId) || {}), productCount: Number(row.count) });
    });
    jobRows.forEach((row) => {
      map.set(row.tenantId, { ...(map.get(row.tenantId) || {}), jobCount: Number(row.count) });
    });
    products.forEach((product) => {
      const meta = map.get(product.tenantId!) || {};
      const images = meta.latestProductImages || [];
      if (images.length < 3) {
        images.push(...this.extractProductImages([product]).slice(0, 3 - images.length));
      }
      map.set(product.tenantId!, { ...meta, latestProductImages: images });
    });

    return map;
  }

  private toTenantView(
    tenant: Tenant,
    meta?: {
      config?: PortalConfig | null;
      productCount?: number;
      jobCount?: number;
      latestProductImages?: string[];
    },
  ) {
    const footerInfo = meta?.config?.footerInfo || {};
    const homeConfig = meta?.config?.homeConfig || {};
    const logo = meta?.config?.logo || '';
    const heroImage = homeConfig.heroImage || meta?.latestProductImages?.[0] || logo || '';
    const address = footerInfo.address || tenant.factoryAddress || tenant.address || tenant.registerAddress;

    return {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      industryType: tenant.industryType,
      logo,
      heroImage,
      description: meta?.config?.description || tenant.remark || '',
      contactPerson: footerInfo.contactPerson || tenant.contactPerson,
      contactPhone: footerInfo.phone || tenant.contactPhone,
      qrCode: footerInfo.qrCode || '',
      address,
      factoryAddress: tenant.factoryAddress,
      website: tenant.website,
      mainProducts: tenant.mainProducts,
      annualCapacity: tenant.annualCapacity,
      staffCount: tenant.staffCount,
      foundDate: tenant.foundDate,
      approvedAt: tenant.approvedAt,
      updatedAt: tenant.updatedAt,
      productCount: meta?.productCount || 0,
      jobCount: meta?.jobCount || 0,
      latestProductImages: meta?.latestProductImages || [],
    };
  }

  private extractBusinessLicenseImage(remark?: string | null) {
    if (!remark) return '';
    const match = remark.match(/营业执照图片[:：]\s*(https?:\/\/\S+)/);
    return match?.[1] || '';
  }

  private toProductView(product: Product) {
    return {
      id: product.id,
      name: product.name,
      code: product.code,
      categoryId: product.categoryId,
      categoryName: product.category?.name || '',
      images: product.images || [],
      unit: product.unit,
      description: product.description,
      specs: product.specs || {},
      specList: this.toProductSpecList(product),
      safetyStock: product.safetyStock,
      tenantId: product.tenantId,
    };
  }

  private extractProductImages(products: Product[]) {
    return products.flatMap((product) => product.images || []).filter(Boolean).slice(0, 3);
  }

  private toProductSpecList(product: Product) {
    const specs = product.specs || {};
    const attributes = product.category?.attributes || [];
    const attributeMap = new Map<string, (typeof attributes)[number]>();

    attributes.forEach((attribute) => {
      if (attribute.code) attributeMap.set(attribute.code, attribute);
      if (attribute.name) attributeMap.set(attribute.name, attribute);
    });

    return Object.keys(specs)
      .filter((key) => specs[key] !== undefined && specs[key] !== null && specs[key] !== '')
      .map((key) => {
        const attribute = attributeMap.get(key);
        const value = specs[key];
        const unit = attribute?.unit || '';

        return {
          key,
          label: attribute?.name || key,
          value,
          unit,
          text: `${attribute?.name || key}：${value}${unit}`,
        };
      });
  }
}
