// src/modules/product/service/attributes.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, DataSource } from 'typeorm';

import { Attribute } from '../entities/attribute.entity';
import { AttributeOption } from '../entities/attribute-option.entity';
import { BusinessException } from '@/common/filters/business.exception';
import { QueryAttributeDto } from '../entities/dto/query-attribute.dto';
import { SaveAttributeDto } from '../entities/dto/save-attribute.dto';
import pinyin from 'pinyin';

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
    @InjectRepository(AttributeOption)
    private readonly optionRepo: Repository<AttributeOption>,
    private readonly dataSource: DataSource, // 引入 API 事务管理
  ) {}

  /**
   * 内部工具：生成业务编码
   * 规则：ATTR_简拼_4位大写随机码
   */
  private generateCode(name: string): string {
    const initials =
      pinyin(name, { style: pinyin.STYLE_FIRST_LETTER })
        .map((arr) => arr[0].toUpperCase())
        .join('') || 'X';
    // 使用 padStart 确保随机码始终为 4 位
    const random = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, '0');
    return `ATTR_${initials}_${random}`;
  }

  /**
   * 保存/更新属性 (统一入口)
   * 采用“先清空再重建”策略处理规格项，彻底杜绝外键置空报错
   */
  async save(dto: SaveAttributeDto, tenantId: string) {
    // 1. 编码自动填充
    if (!dto.code) {
      dto.code = this.generateCode(dto.name);
    }

    // 2. 唯一性校验
    const exists = await this.attributeRepo.findOne({
      where: { code: dto.code, tenantId, ...(dto.id ? { id: Not(dto.id) } : {}) },
    });
    if (exists) throw new BusinessException('属性编码已存在');

    // 3. 事务处理：保证属性与规格同步更新的原子性
    return await this.dataSource.transaction(async (manager) => {
      let entity: Attribute;

      if (dto.id) {
        // 【更新模式】
        entity = await manager.findOne(Attribute, {
          where: { id: dto.id, tenantId },
          relations: ['options'],
        });
        if (!entity) throw new BusinessException('属性不存在或无权操作');

        // A. 物理删除旧选项，防止产生孤儿数据
        await manager.delete(AttributeOption, { attributeId: entity.id });

        // B. 合并基础字段
        const { options, ...baseInfo } = dto;
        Object.assign(entity, baseInfo);
      } else {
        // 【新增模式】
        entity = manager.create(Attribute, { ...dto, tenantId });
      }

      // 4. 保存主表获取 ID
      const savedAttribute = await manager.save(entity);

      // 5. 重建从表数据
      if (dto.options && Array.isArray(dto.options)) {
        const newOptions = dto.options.map((opt) =>
          manager.create(AttributeOption, {
            ...opt,
            id: undefined, // 强制视为新数据插入
            attributeId: savedAttribute.id,
            tenantId,
          }),
        );
        await manager.save(AttributeOption, newOptions);
      }

      // 6. 返回最新详情，确保前端一键回显
      return this.getDetail(savedAttribute.id, tenantId);
    });
  }

  /**
   * 分页查询：按创建时间正序 (ASC)
   */
  async findPage(query: QueryAttributeDto, tenantId: string) {
    const { page = 1, pageSize = 20, name, code, isActive } = query;
    const where: any = { tenantId };

    if (name) where.name = Like(`%${name}%`);
    if (code) where.code = Like(`%${code}%`);
    if (isActive !== undefined) where.isActive = isActive;

    const [list, total] = await this.attributeRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' }, // 满足排序需求
      relations: ['options'],
    });

    return { list, total, page, pageSize };
  }

  /**
   * 获取详情：完全匹配 SaveAttributeDto 结构
   */
  async getDetail(id: string, tenantId: string) {
    const attr = await this.attributeRepo.findOne({
      where: { id, tenantId },
      relations: ['options'],
      order: { options: { sort: 'ASC' } },
    });

    if (!attr) throw new BusinessException('属性不存在或无权操作');

    return {
      id: attr.id,
      name: attr.name,
      code: attr.code,
      type: attr.type,
      unit: attr.unit,
      isActive: attr.isActive,
      // 保持 options 数组的简洁对称
      options: (attr.options || []).map((opt) => ({
        id: opt.id,
        value: opt.value,
        sort: opt.sort,
        isActive: opt.isActive,
      })),
    };
  }

  /**
   * 伪删除：同步标记子表 (可选优化)
   */
  async delete(id: string, tenantId: string) {
    const attr = await this.attributeRepo.findOne({
      where: { id, tenantId },
      relations: ['options'],
    });
    if (!attr) throw new BusinessException('数据不存在');

    // 伪删除主表，TypeORM 会处理带有 @DeleteDateColumn 的字段
    await this.attributeRepo.softRemove(attr);
    return { message: '已移入回收站' };
  }

  /**
   * 状态变更
   */
  async updateStatus(id: string, isActive: number, tenantId: string) {
    const res = await this.attributeRepo.update({ id, tenantId }, { isActive });
    if (res.affected === 0) throw new BusinessException('属性不存在或无权操作');
    return { message: isActive ? '已启用' : '已禁用' };
  }
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
}
