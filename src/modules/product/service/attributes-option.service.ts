import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { AttributeOption } from '../entities/attribute-option.entity';
import { Attribute } from '../entities/attribute.entity';
import { QueryOptionDto } from '../entities/dto/query-option.dto';
import { SaveOptionDto } from '../entities/dto/save-option.dto';
import { BusinessException } from '@/common/filters/business.exception';

// src/modules/attributes/options.service.ts
@Injectable()
export class OptionsService {
  constructor(
    @InjectRepository(AttributeOption)
    private readonly optionRepo: Repository<AttributeOption>,
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
  ) {}

  private scopeWhere(tenantId: string | null) {
    return tenantId === null ? { tenantId: IsNull() } : { tenantId };
  }

  private readableScopeWhere(tenantId: string | null) {
    return tenantId === null ? [{ tenantId: IsNull() }] : [{ tenantId }, { tenantId: IsNull() }];
  }

  private async findReadableAttribute(attributeId: string, tenantId: string | null) {
    return this.attributeRepo.findOne({
      where: this.readableScopeWhere(tenantId).map((scope) => ({ id: attributeId, ...scope })),
    });
  }

  /** * 分页查看所有规格值
   * 排序：按 createdAt 正序 (ASC)
   */
  async findPage(query: QueryOptionDto, tenantId: string | null) {
    const { page, pageSize, attributeId, value, templateScope } = query;

    const queryBuilder = this.optionRepo
      .createQueryBuilder('option')
      .leftJoinAndSelect('option.attribute', 'attribute');

    if (tenantId === null) {
      queryBuilder.andWhere('option.tenantId IS NULL');
      queryBuilder.andWhere('attribute.tenantId IS NULL');
    } else {
      queryBuilder.andWhere('(option.tenantId = :tenantId OR option.tenantId IS NULL)', {
        tenantId,
      });
      queryBuilder.andWhere('(attribute.tenantId = :tenantId OR attribute.tenantId IS NULL)', {
        tenantId,
      });
    }

    if (templateScope === 'standard') queryBuilder.andWhere('option.tenantId IS NULL');
    if (templateScope === 'custom')
      queryBuilder.andWhere('option.tenantId = :tenantId', { tenantId });
    if (attributeId) queryBuilder.andWhere('option.attributeId = :attributeId', { attributeId });
    if (value) queryBuilder.andWhere('option.value LIKE :value', { value: `%${value}%` });

    const safePage = Number(page || 1);
    const safePageSize = Number(pageSize || 10);
    const [list, total] = await queryBuilder
      .orderBy('option.tenantId', 'ASC')
      .addOrderBy('option.sort', 'ASC')
      .addOrderBy('option.createdAt', 'ASC')
      .skip((safePage - 1) * safePageSize)
      .take(safePageSize)
      .getManyAndCount();

    return { list, total, page: safePage, pageSize: safePageSize };
  }

  /** 保存单个规格 **/
  async save(dto: SaveOptionDto, tenantId: string | null) {
    // 1. 参数校验：attributeId、value 必填
    if (!dto.attributeId || !dto.value) {
      throw new BusinessException('attributeId 和 value 均不能为空');
    }
    const attribute = await this.findReadableAttribute(dto.attributeId, tenantId);
    if (!attribute) throw new BusinessException('规格属性不存在或无权操作');

    // 3. 唯一性校验：同一 attributeId + value + tenantId 不能重复
    const exists = await this.optionRepo.findOne({
      where: [
        { attributeId: dto.attributeId, value: dto.value, ...this.scopeWhere(tenantId) },
        { attributeId: dto.attributeId, value: dto.value, tenantId: IsNull() },
      ],
    });
    if (exists) throw new BusinessException('该规格值已存在');

    // 4. 创建并保存，tenantId 必须同步
    const option = this.optionRepo.create({
      attribute: { id: dto.attributeId },
      attributeId: dto.attributeId,
      value: dto.value,
      sort: dto.sort ?? 0,
      isActive: dto.isActive ?? 1,
      tenantId,
    });
    return await this.optionRepo.save(option);
  }

  /** 批量保存（工业品常用场景：一次录入一堆直径） **/
  async batchSave(attributeId: string, values: string[], tenantId: string | null) {
    // 1. 参数校验
    if (!attributeId || !Array.isArray(values) || values.length === 0) {
      throw new BusinessException('attributeId 和 values 必填');
    }
    const attribute = await this.findReadableAttribute(attributeId, tenantId);
    if (!attribute) throw new BusinessException('规格属性不存在或无权操作');

    // 2. 去重（防止前端传重复值）
    const uniqueValues = Array.from(new Set(values.filter(Boolean)));

    // 3. 查询已存在的规格，避免重复插入
    const exists = await this.optionRepo.find({
      where: [
        { attributeId, value: In(uniqueValues), ...this.scopeWhere(tenantId) },
        { attributeId, value: In(uniqueValues), tenantId: IsNull() },
      ],
    });
    const existsSet = new Set(exists.map((opt) => opt.value));
    const toInsert = uniqueValues.filter((v) => !existsSet.has(v));

    // 4. 批量创建
    const options = toInsert.map((v, index) =>
      this.optionRepo.create({
        attribute: { id: attributeId },
        attributeId,
        value: v,
        sort: index,
        isActive: 1,
        tenantId,
      }),
    );
    if (options.length === 0) return { message: '全部已存在，无需新增' };

    // 5. 批量保存
    return await this.optionRepo.save(options);
  }

  /** 删除规格 **/
  async delete(id: string, tenantId: string | null) {
    // 1. 校验归属权
    const option = await this.optionRepo.findOne({ where: { id, ...this.scopeWhere(tenantId) } });
    if (!option) throw new BusinessException('规格不存在或无权操作');
    // 2. 删除
    return await this.optionRepo.remove(option);
  }

  /** 批量删除规格值 **/
  async batchDelete(ids: string[], tenantId: string | null) {
    if (!ids || ids.length === 0) {
      throw new BusinessException('请选择要删除的规格值');
    }

    // 查询所有要删除的规格值
    const options = await this.optionRepo.find({
      where: ids.map((id) => ({ id, ...this.scopeWhere(tenantId) })),
    });

    if (options.length === 0) {
      throw new BusinessException('未找到可删除的规格值');
    }

    // 批量删除
    await this.optionRepo.remove(options);
    return { message: `成功删除 ${options.length} 个规格值` };
  }
  /** 更改规格状态（启用/禁用） **/
  async updateStatus(id: string, isActive: number, tenantId: string | null) {
    // 校验归属权
    const option = await this.optionRepo.findOne({ where: { id, ...this.scopeWhere(tenantId) } });
    if (!option) throw new BusinessException('规格不存在或无权操作');
    option.isActive = isActive;
    await this.optionRepo.save(option);
    return { message: isActive ? '已启用' : '已禁用' };
  }
  /** * 2. 获取详情 (getDetail)
   * 满足“对称性”要求：返回结构与 SaveOptionDto 一致
   */
  async getDetail(id: string, tenantId: string | null) {
    const option = await this.optionRepo.findOne({
      where: this.readableScopeWhere(tenantId).map((scope) => ({ id, ...scope })),
    });
    if (!option) throw new BusinessException('规格不存在');

    return {
      id: option.id,
      attributeId: option.attributeId,
      value: option.value,
      sort: option.sort,
      isActive: option.isActive,
    };
  }
  /** 更新规格值 */
  async update(dto: SaveOptionDto, tenantId: string | null) {
    if (!dto.id) throw new BusinessException('缺少规格ID，无法更新');
    const option = await this.optionRepo.findOne({
      where: { id: dto.id, ...this.scopeWhere(tenantId) },
    });
    if (!option) throw new BusinessException('规格不存在或无权操作');
    if (dto.attributeId) {
      const attribute = await this.findReadableAttribute(dto.attributeId, tenantId);
      if (!attribute) throw new BusinessException('规格属性不存在或无权操作');
    }
    if (dto.value) {
      const exists = await this.optionRepo.findOne({
        where: this.readableScopeWhere(tenantId).map((scope) => ({
          attributeId: dto.attributeId || option.attributeId,
          value: dto.value,
          ...scope,
          id: Not(dto.id),
        })),
      });
      if (exists) throw new BusinessException('该规格值已存在');
    }
    Object.assign(option, dto);
    await this.optionRepo.save(option);
    return option;
  }
}
