import { BusinessException } from '@/common/filters/business.exception';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/product.entity';
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

    return {
      list: list.map((tenant) => this.toTenantView(tenant)),
      total,
      page,
      pageNo: page,
      pageSize,
    };
  }

  async getDetail(id: string) {
    const tenant = await this.findPublicTenant(id);

    const products = await this.productRepo.find({
      where: { tenantId: id, isActive: 1 },
      order: { createdAt: 'DESC' },
      take: 20,
      relations: ['category', 'category.attributes'],
    });
    const jobs = await this.jobRepo.find({
      where: { tenantId: id, isActive: 1 },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      take: 20,
    });

    return {
      ...this.toTenantView(tenant),
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
    await this.findPublicTenant(tenantId);

    const product = await this.productRepo.findOne({
      where: { id: productId, tenantId, isActive: 1 },
      relations: ['category', 'category.attributes'],
    });
    if (!product) throw new BusinessException('产品不存在或未公开');

    return this.toProductView(product);
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

  private toTenantView(tenant: Tenant) {
    return {
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
      industryType: tenant.industryType,
      contactPerson: tenant.contactPerson,
      contactPhone: tenant.contactPhone,
      address: tenant.factoryAddress || tenant.address || tenant.registerAddress,
      factoryAddress: tenant.factoryAddress,
      website: tenant.website,
      mainProducts: tenant.mainProducts,
      annualCapacity: tenant.annualCapacity,
      staffCount: tenant.staffCount,
      foundDate: tenant.foundDate,
      approvedAt: tenant.approvedAt,
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
    };
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
