import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { BusinessException } from '@/common/filters/business.exception';
import { Category } from './entities/category.entity';
import { QueryProductDto } from './entities/dto/query-product.dto';
import { SaveProductDto } from './entities/dto/save-product.dto';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 通用 SKU 生成策略：时间戳 + 4位随机数
   * 简短且唯一，不依赖类目和属性
   */
  private generateSkuCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase(); // 转为36进制并大写
    const random = Math.floor(1000 + Math.random() * 9000); // 4位随机数
    return `SKU-${timestamp}-${random}`;
  }

  /** 新增产品 */
  async save(dto: SaveProductDto, tenantId: string) {
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId, tenantId } });
    if (!category) throw new BusinessException('所选类目不存在');

    // 如果未传编码，则自动生成通用SKU
    if (!dto.code) {
      dto.code = this.generateSkuCode();
    }

    const exists = await this.productRepo.findOne({ where: { code: dto.code, tenantId } });
    if (exists) throw new BusinessException(`产品编码 ${dto.code} 已存在`);

    const product = this.productRepo.create({ ...dto, tenantId });
    const saved = await this.productRepo.save(product);
    return this.getDetail(saved.id, tenantId);
  }

  /** 更新产品 */
  async update(dto: SaveProductDto, tenantId: string) {
    if (!dto.id) throw new BusinessException('缺少产品ID');

    const product = await this.productRepo.findOne({ where: { id: dto.id, tenantId } });
    if (!product) throw new BusinessException('产品不存在');

    // 对称赋值
    Object.assign(product, dto);
    const updated = await this.productRepo.save(product);
    return this.getDetail(updated.id, tenantId);
  }

  /** 分页查询：支持类目联动筛选 */
  async findPage(query: QueryProductDto, tenantId: string) {
    const { page = 1, pageSize = 20, keyword, categoryId, isActive } = query;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.tenantId = :tenantId', { tenantId });

    if (keyword) {
      qb.andWhere('(p.name LIKE :kw OR p.code LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId });
    }
    if (isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive });
    }

    const [list, total] = await qb
      .orderBy('p.createdAt', 'DESC') // 遵循时间排序规范
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  // src/modules/product/service/products.service.ts

  /**
   * 获取产品详情 (对称结构优化)
   * 确保返回字段与 SaveProductDto 完全一致
   */
  async getDetail(id: string, tenantId: string) {
    // 1. 查询产品及必要关联
    const product = await this.productRepo.findOne({
      where: { id, tenantId },
      relations: ['category'], // 加载类目信息以备不时之需
    });

    if (!product) throw new BusinessException('产品不存在');

    // 2. 构建对称返回结构
    // 显式提取字段，确保 categoryId 以字符串形式存在于顶层
    const { category, ...baseInfo } = product;

    return {
      ...baseInfo,
      /**
       * 对称性处理：
       * 1. categoryId: 前端 Form 提交时需要字符串 ID，而不是整个对象
       * 2. specs: TypeORM 会自动处理 MySQL JSON 反序列化，此处已是对象
       * 3. images: 此处已是数组格式，方便 Upload 组件回显
       */
      categoryId: product.categoryId,
      // 如果之后需要在列表展示类目名称，可以保留 category 对象，但 categoryId 必须在顶层
      categoryName: category?.name,
    };
  }
  /**
   * 修改产品状态 (1:启用, 0:禁用)
   */
  async updateStatus(id: string, isActive: number, tenantId: string) {
    const product = await this.productRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new BusinessException('产品不存在');

    await this.productRepo.update({ id, tenantId }, { isActive });
    return { message: '状态已更新' };
  }

  /**
   * 删除产品 (伪删除)
   * 使用 softRemove，TypeORM 会自动填充 deletedAt 字段
   */
  async delete(id: string, tenantId: string) {
    const product = await this.productRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new BusinessException('产品不存在');

    // 执行软删除，保留业务轨迹
    await this.productRepo.softRemove(product);
    return { message: '产品已移入回收站' };
  }
}
