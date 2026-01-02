// src/modules/product/service/attributes.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not } from 'typeorm';
import { Attribute } from '../entities/attribute.entity';
import { AttributeOption } from '../entities/attribute-option.entity'; // 1. 必须引入选项实体

import { BusinessException } from '@/common/filters/business.exception';
import { QueryAttributeDto } from '../entities/dto/query-attribute.dto';
import { SaveAttributeDto } from '../entities/dto/save-attribute.dto';

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,

    @InjectRepository(AttributeOption)
    private readonly optionRepo: Repository<AttributeOption>, // 2. 注入选项 Repo 解决类型报错
  ) {}

  /**
   * 分页查询：按创建时间正序 (ASC)
   * 路径规范: GET /attributes/page
   */
  async findPage(query: QueryAttributeDto, tenantId: string) {
    const { page = 1, pageSize = 20, name, code, isActive } = query;
    const where: any = { tenantId }; // 始终携带租户隔离

    if (name) where.name = Like(`%${name}%`);
    if (code) where.code = Like(`%${code}%`);
    if (isActive !== undefined) where.isActive = isActive;

    const [list, total] = await this.attributeRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' }, // 满足排序需求
      relations: ['options'], // 级联带出选项
    });

    return { list, total, page, pageSize };
  }

  /**
   * 新增/更新属性：解决 TS2322 类型报错
   * 路径规范: POST /attributes/save
   */
  async save(dto: SaveAttributeDto, tenantId: string) {
    // 1. 唯一性校验 (排除自身 ID)
    const exists = await this.attributeRepo.findOne({
      where: { code: dto.code, tenantId, ...(dto.id ? { id: Not(dto.id) } : {}) },
    });
    if (exists) throw new BusinessException('属性编码已存在');

    let entity: Attribute;

    if (dto.id) {
      // 更新逻辑：加载现有数据
      entity = await this.attributeRepo.findOne({
        where: { id: dto.id, tenantId },
        relations: ['options'],
      });
      if (!entity) throw new BusinessException('属性不存在或无权操作');

      // 合并基础字段，排除 options 手动处理
      const { options, ...baseInfo } = dto;
      Object.assign(entity, baseInfo);
    } else {
      // 新增逻辑
      entity = this.attributeRepo.create({ ...dto, tenantId });
    }

    // 2. 核心优化：处理 options 级联转化，解决 TS2322 报错
    if (dto.options && Array.isArray(dto.options)) {
      entity.options = dto.options.map((opt) => {
        // 使用 optionRepo.create 将 Plain Object 转化为 Entity Instance
        return this.optionRepo.create({
          ...opt,
          tenantId, // 强制注入子表租户 ID
          attributeId: entity.id,
        });
      });
    }

    // 3. 利用实体配置的 cascade: true 自动同步保存主从表
    return await this.attributeRepo.save(entity);
  }
  // src/modules/attributes/attributes.service.ts

  async update(dto: SaveAttributeDto, tenantId: string) {
    if (!dto.id) throw new BusinessException('缺少属性ID，无法更新');

    // 使用事务确保“删除”和“插入”的原子性
    return await this.attributeRepo.manager.transaction(async (manager) => {
      // 1. 查找父实体
      const entity = await manager.findOne(Attribute, {
        where: { id: dto.id, tenantId },
      });
      if (!entity) throw new BusinessException('属性不存在或无权操作');

      // 2. 物理删除数据库中该属性下的所有旧选项
      // 这样彻底断开关联，不会再报 Column 'attributeId' cannot be null
      await manager.delete(AttributeOption, { attributeId: entity.id });

      // 3. 更新父实体的基础字段
      const { options, ...baseInfo } = dto;
      Object.assign(entity, baseInfo);
      await manager.save(entity);

      // 4. 重建选项：将其全部视为新记录插入
      if (Array.isArray(options) && options.length > 0) {
        const newOptions = options.map((opt) => {
          // 关键：剔除前端传回的旧 id，确保全部作为全新记录 INSERT
          const { id, ...data } = opt;
          return manager.create(AttributeOption, {
            ...data,
            attributeId: entity.id, // 明确绑定外键
            tenantId,
          });
        });
        // 批量保存新选项
        await manager.save(AttributeOption, newOptions);
      }

      // 5. 返回最新的详情，保持“入参即出参”对称
      return this.getDetail(entity.id, tenantId);
    });
  }
  /**
   * 伪删除：从 remove 优化为 softRemove
   * 路径规范: POST /attributes/delete
   */
  async delete(id: string, tenantId: string) {
    const attr = await this.attributeRepo.findOne({
      where: { id, tenantId },
      relations: ['options'],
    });
    if (!attr) throw new BusinessException('数据不存在');

    // 使用 softRemove 实现伪删除，保留数据轨迹
    await this.attributeRepo.softRemove(attr);
    return { message: '已移入回收站' };
  }

  /**
   * 更改属性状态
   * 路径规范: POST /attributes/status
   */
  async updateStatus(id: string, isActive: number, tenantId: string) {
    const attr = await this.attributeRepo.findOne({ where: { id, tenantId } });
    if (!attr) throw new BusinessException('数据不存在');

    attr.isActive = isActive; // 建议统一使用 boolean
    await this.attributeRepo.save(attr);
    return { message: isActive ? '已启用' : '已禁用' };
  }
  // src/modules/product/service/attributes.service.ts

  /**
   * 获取属性详情：出参结构对齐 SaveAttributeDto
   * 路径规范: GET /attributes/detail
   */
  async getDetail(id: string, tenantId: string) {
    const attr = await this.attributeRepo.findOne({
      where: { id, tenantId },
      relations: ['options'],
      // 规格选项按 sort 排序，保证前端显示顺序一致
      order: { options: { sort: 'ASC' } },
    });

    if (!attr) throw new BusinessException('属性不存在或无权操作');

    // 核心：手动映射，确保返回字段名、结构与 SaveAttributeDto 一一对应
    return {
      id: attr.id,
      name: attr.name,
      code: attr.code,
      type: attr.type,
      unit: attr.unit,
      isActive: attr.isActive,
      // 带上 attributeId 字段
      options: attr.options.map((opt) => ({
        value: opt.value,
        sort: opt.sort,
      })),
    };
  }
}
