// src/modules/product/service/attributes.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';

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
    // 新增时禁止传 id
    if (dto.id) throw new BusinessException('新增时不能传属性ID');
    if (!dto.code) {
      dto.code = this.generateCode(dto.name);
    }
    // 编码唯一性校验
    const exists = await this.attributeRepo.findOne({ where: { code: dto.code, tenantId } });
    if (exists) throw new BusinessException('属性编码已存在');
    return await this.dataSource.transaction(async (manager) => {
      const entity = manager.create(Attribute, {
        name: dto.name,
        code: dto.code,
        type: dto.type,
        unit: dto.unit,
        isActive: dto.isActive,
        tenantId,
      });
      const savedAttribute = await manager.save(entity);
      if (savedAttribute.type === 'select') {
        if (dto.options && Array.isArray(dto.options) && dto.options.length > 0) {
          const newOptions = dto.options.map((opt) =>
            manager.create(AttributeOption, {
              ...opt,
              id: undefined,
              attributeId: savedAttribute.id,
              tenantId,
            }),
          );
          await manager.save(AttributeOption, newOptions);
        }
      }
      return { message: '创建成功', id: savedAttribute.id };
    });
  }

  async update(dto: SaveAttributeDto, tenantId: string) {
    if (!dto.id) throw new BusinessException('更新时必须传属性ID');

    if (dto.type === 'select') {
      if (!dto.options || !Array.isArray(dto.options) || dto.options.length === 0) {
        throw new BusinessException('select 类型的属性必须提供至少一个选项');
      }
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. 获取现有属性（不需要查 relations，避免内存污染）
      const entity = await manager.findOne(Attribute, {
        where: { id: dto.id, tenantId },
      });
      if (!entity) throw new BusinessException(`属性不存在或无权操作`);

      // 2. 执行硬删除旧规格
      // 建议直接用 manager.delete 替代原生 SQL，更安全
      await manager.delete(AttributeOption, { attributeId: entity.id, tenantId });

      // 3. 更新基础信息
      Object.assign(entity, {
        name: dto.name,
        code: dto.code || this.generateCode(dto.name),
        type: dto.type,
        unit: dto.unit,
        isActive: dto.isActive,
      });
      const savedAttribute = await manager.save(entity);

      // 4. 只有 select 类型才重建选项
      if (savedAttribute.type === 'select') {
        const newOptions = dto.options.map((opt) =>
          manager.create(AttributeOption, {
            value: opt.value,
            sort: opt.sort ?? 0,
            isActive: opt.isActive ?? 1,
            attributeId: savedAttribute.id,
            tenantId,
          }),
        );
        await manager.save(AttributeOption, newOptions);
      }

      return { message: '更新成功' };
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
    });
    if (!attr) throw new BusinessException('数据不存在');

    // 硬删除，关联的 AttributeOption 会通过数据库外键级联删除
    await this.attributeRepo.remove(attr);
    return { message: '删除成功' };
  }

  /**
   * 状态变更
   */
  async updateStatus(id: string, isActive: number, tenantId: string) {
    const res = await this.attributeRepo.update({ id, tenantId }, { isActive });
    if (res.affected === 0) throw new BusinessException('属性不存在或无权操作');
    return { message: isActive ? '已启用' : '已禁用' };
  }
}
