// src/modules/product/service/categories.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Like, Not } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Attribute } from '../entities/attribute.entity';
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
    private readonly dataSource: DataSource,
  ) {}
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
  async save(dto: SaveCategoryDto, tenantId: string) {
    // 1. 自动生成编码：如果未传 code 且是新增操作
    if (!dto.id && !dto.code) {
      dto.code = this.generateCategoryCode(dto.name);
    }

    // 2. 唯一性校验
    const exists = await this.categoryRepo.findOne({
      where: { code: dto.code, tenantId },
    });
    if (exists) throw new BusinessException('类目编码已存在，请重试或手动修改');
    console.log('🚀 ~ CategoriesService ~ save ~ tenantId:', tenantId);

    return await this.dataSource.transaction(async (manager) => {
      // 3. 创建实体并绑定属性 (逻辑同前)
      const category = manager.create(Category, { ...dto, tenantId });

      if (dto.attributeIds) {
        category.attributes = await manager.findBy(Attribute, {
          id: In(dto.attributeIds),
        });
      }

      const saved = await manager.save(category);
      return { message: '创建成功', id: saved.id };
    });
  }
  /** 分页查询 */
  async findPage(query: QueryCategoryDto, tenantId: string) {
    const { page = 1, pageSize = 20, name, isActive } = query;
    const where: any = { tenantId };
    if (name) where.name = Like(`%${name}%`);
    if (isActive !== undefined) where.isActive = isActive;

    const [list, total] = await this.categoryRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
      relations: ['attributes', 'attributes.options'], // 关键：带出属性关联
    });
    // 映射每个类目，带上 attributeIds 数组
    const resultList = list.map((item) => ({
      ...item,
      attributeIds: (item.attributes || []).map((a) => a.id),
      attributeNames: (item.attributes || []).map((a) => a.name).join(','),
    }));
    return { list: resultList, total, page, pageSize };
  }

  /** 获取详情 (对称结构) */
  async getDetail(id: string, tenantId: string) {
    const category = await this.categoryRepo.findOne({
      where: { id, tenantId },
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
  async updateStatus(id: string, isActive: number, tenantId: string) {
    await this.categoryRepo.update({ id, tenantId }, { isActive });
    return { message: '状态已更新' };
  }

  async delete(id: string, tenantId: string) {
    const category = await this.categoryRepo.findOne({ where: { id, tenantId } });
    if (!category) throw new BusinessException('数据不存在');
    await this.categoryRepo.softRemove(category);
    return { message: '已移入回收站' };
  }

  async update(dto: SaveCategoryDto, tenantId: string) {
    if (!dto.id) throw new BusinessException('缺少类目ID');

    return await this.dataSource.transaction(async (manager) => {
      const category = await manager.findOne(Category, {
        where: { id: dto.id, tenantId },
        relations: ['attributes'],
      });
      if (!category) throw new BusinessException('类目不存在');

      // 更新时如果 code 为空，也可以补全生成
      if (!dto.code) {
        dto.code = this.generateCategoryCode(dto.name);
      }

      // 校验编码冲突 (排除自身)
      const codeExists = await manager.findOne(Category, {
        where: { code: dto.code, tenantId, id: Not(dto.id) },
      });
      if (codeExists) throw new BusinessException('类目编码冲突');

      const { attributeIds, ...baseInfo } = dto;
      Object.assign(category, baseInfo);

      if (Array.isArray(attributeIds)) {
        category.attributes = await manager.findBy(Attribute, { id: In(attributeIds) });
      }

      const updated = await manager.save(category);
      return this.getDetail(updated.id, tenantId);
    });
  }
}
