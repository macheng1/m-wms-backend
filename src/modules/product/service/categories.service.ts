// src/modules/product/service/categories.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull, Like, Not } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Attribute } from '../entities/attribute.entity';
import { Product } from '../product.entity';
import { BusinessException } from '@/common/filters/business.exception';
import { SaveCategoryDto, QueryCategoryDto } from '../entities/dto/save-category.dto';
import pinyin from 'pinyin';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  private scopeWhere(tenantId: string | null) {
    return tenantId === null ? { tenantId: IsNull() } : { tenantId };
  }

  private applyReadableScope(
    queryBuilder: ReturnType<Repository<Category>['createQueryBuilder']>,
    tenantId: string | null,
    alias = 'category',
  ) {
    if (tenantId === null) {
      queryBuilder.andWhere(`${alias}.tenantId IS NULL`);
    } else {
      queryBuilder.andWhere(`(${alias}.tenantId = :tenantId OR ${alias}.tenantId IS NULL)`, { tenantId });
    }
  }

  private readableScopeWhere(tenantId: string | null) {
    return tenantId === null ? [{ tenantId: IsNull() }] : [{ tenantId }, { tenantId: IsNull() }];
  }

  /**
   * 内部工具：获取拼音首字母简拼
   */
  private getInitials(name: string): string {
    return pinyin(name, {
      style: pinyin.STYLE_FIRST_LETTER,
    })
      .map((item) => item[0])
      .join('')
      .toUpperCase();
  }

  /**
   * 自动生成类目业务编码
   */
  private generateCategoryCode(name: string): string {
    const initials = this.getInitials(name) || 'X';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, '0');
    return `CAT_${initials}_${random}`;
  }
  /**
   * 保存类目 (新增入口)
   */
  async save(dto: SaveCategoryDto, tenantId: string | null) {
    // 1. 自动生成编码：如果未传 code 且是新增操作
    if (!dto.id && !dto.code) {
      dto.code = this.generateCategoryCode(dto.name);
    }

    // 2. 唯一性校验
    const exists = await this.categoryRepo.findOne({
      where: this.readableScopeWhere(tenantId).map((scope) => ({ code: dto.code, ...scope })),
    });
    if (exists) throw new BusinessException('类目编码已存在，请重试或手动修改');

    return await this.dataSource.transaction(async (manager) => {
      // 3. 创建实体并绑定属性 (逻辑同前)
      const category = manager.create(Category, { ...dto, tenantId });

      if (dto.attributeIds) {
        category.attributes = await manager.findBy(Attribute, {
          id: In(dto.attributeIds),
          ...this.scopeWhere(tenantId),
        });
        if (tenantId !== null) {
          category.attributes = await manager.find(Attribute, {
            where: this.readableScopeWhere(tenantId).map((scope) => ({
              id: In(dto.attributeIds),
              ...scope,
            })),
          });
        }
        if (category.attributes.length !== dto.attributeIds.length) {
          throw new BusinessException('存在不可绑定的属性');
        }
      }

      const saved = await manager.save(category);
      return { message: '创建成功', id: saved.id };
    });
  }
  /** 分页查询 */
  async findPage(query: QueryCategoryDto, tenantId: string | null) {
    const { page = 1, pageSize = 20, name, isActive } = query;
    const queryBuilder = this.categoryRepo
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.attributes', 'attributes')
      .leftJoinAndSelect('attributes.options', 'options');

    this.applyReadableScope(queryBuilder, tenantId);
    if (name) queryBuilder.andWhere('category.name LIKE :name', { name: `%${name}%` });
    if (isActive !== undefined) queryBuilder.andWhere('category.isActive = :isActive', { isActive });

    const [list, total] = await queryBuilder
      .orderBy('category.tenantId', 'ASC')
      .addOrderBy('category.createdAt', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    // 映射每个类目，带上 attributeIds 数组
    const resultList = list.map((item) => ({
      ...item,
      attributeIds: (item.attributes || []).map((a) => a.id),
      attributeNames: (item.attributes || []).map((a) => a.name).join(','),
    }));
    return { list: resultList, total, page, pageSize };
  }

  /** 获取详情 (对称结构) */
  async getDetail(id: string, tenantId: string | null) {
    const category = await this.categoryRepo.findOne({
      where: this.readableScopeWhere(tenantId).map((scope) => ({ id, ...scope })),
      relations: ['attributes', 'attributes.options'],
    });
    if (!category) throw new BusinessException('数据不存在');

    return {
      ...category,
      // 核心：将 attributes 实体数组转回 ID 数组，对齐 SaveCategoryDto
      attributeIds: (category.attributes || []).map((a) => a.id),
    };
  }

  /** 更新状态 */
  async updateStatus(id: string, isActive: number, tenantId: string | null) {
    const res = await this.categoryRepo.update({ id, ...this.scopeWhere(tenantId) }, { isActive });
    if (res.affected === 0) throw new BusinessException('类目不存在或无权操作');
    return { message: '状态已更新' };
  }

  async delete(id: string, tenantId: string | null) {
    const category = await this.categoryRepo.findOne({ where: { id, ...this.scopeWhere(tenantId) } });
    if (!category) throw new BusinessException('数据不存在');
    const productCount = await this.productRepo.count({
      where: { categoryId: id, ...this.scopeWhere(tenantId) },
    });
    if (productCount > 0) {
      throw new BusinessException('该类目已被产品使用，请先处理产品后再删除');
    }
    await this.categoryRepo.softRemove(category);
    return { message: '已移入回收站' };
  }

  async update(dto: SaveCategoryDto, tenantId: string | null) {
    if (!dto.id) throw new BusinessException('缺少类目ID');

    return await this.dataSource.transaction(async (manager) => {
      const category = await manager.findOne(Category, {
        where: { id: dto.id, ...this.scopeWhere(tenantId) },
        relations: ['attributes'],
      });
      if (!category) throw new BusinessException('类目不存在');

      // 更新时如果 code 为空，也可以补全生成
      if (!dto.code) {
        dto.code = this.generateCategoryCode(dto.name);
      }

      // 校验编码冲突 (排除自身)
      const codeExists = await manager.findOne(Category, {
        where: this.readableScopeWhere(tenantId).map((scope) => ({
          code: dto.code,
          ...scope,
          id: Not(dto.id),
        })),
      });
      if (codeExists) throw new BusinessException('类目编码冲突');

      const { attributeIds, ...baseInfo } = dto;
      Object.assign(category, baseInfo);

      if (Array.isArray(attributeIds)) {
        category.attributes = await manager.find(Attribute, {
          where: this.readableScopeWhere(tenantId).map((scope) => ({
            id: In(attributeIds),
            ...scope,
          })),
        });
        if (category.attributes.length !== attributeIds.length) {
          throw new BusinessException('存在不可绑定的属性');
        }
      }

      const updated = await manager.save(category);
      return this.getDetail(updated.id, tenantId);
    });
  }
}
