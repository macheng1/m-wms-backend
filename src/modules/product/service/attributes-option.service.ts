import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { AttributeOption } from '../entities/attribute-option.entity';
import { QueryOptionDto } from '../entities/dto/query-option.dto';
import { SaveOptionDto } from '../entities/dto/save-option.dto';
import { BusinessException } from '@/common/filters/business.exception';

// src/modules/attributes/options.service.ts
@Injectable()
export class OptionsService {
  constructor(
    @InjectRepository(AttributeOption)
    private readonly optionRepo: Repository<AttributeOption>,
  ) {}

  /** * 分页查看所有规格值
   * 排序：按 createdAt 正序 (ASC)
   */
  async findPage(query: QueryOptionDto, tenantId: string) {
    const { page, pageSize, attributeId, value } = query;

    // 构造查询条件，强制带上租户隔离
    const where: any = { attribute: { tenantId } };

    if (attributeId) where.attributeId = attributeId;
    if (value) where.value = Like(`%${value}%`);

    const [list, total] = await this.optionRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'ASC' }, // 选项通常按 ID 或 sort 排序更好，若需按创建时间则改为 createdAt
      relations: ['attribute'], // 带出所属属性的名称，方便前端显示
    });

    return { list, total, page, pageSize };
  }

  /** 保存单个规格 **/
  async save(dto: SaveOptionDto, tenantId: string) {
    // 1. 参数校验：attributeId、value 必填
    if (!dto.attributeId || !dto.value) {
      throw new BusinessException('attributeId 和 value 均不能为空');
    }
    // 2. 租户隔离校验（如有 attribute 表，建议查一遍 attributeId 是否属于本租户）
    // const attribute = await this.attributeRepo.findOne({ where: { id: dto.attributeId, tenantId } });
    // if (!attribute) throw new BusinessException('规格属性不存在或无权操作');

    // 3. 唯一性校验：同一 attributeId + value + tenantId 不能重复
    const exists = await this.optionRepo.findOne({
      where: { attributeId: dto.attributeId, value: dto.value, tenantId },
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
  async batchSave(attributeId: string, values: string[], tenantId: string) {
    // 1. 参数校验
    if (!attributeId || !Array.isArray(values) || values.length === 0) {
      throw new BusinessException('attributeId 和 values 必填');
    }
    // 2. 去重（防止前端传重复值）
    const uniqueValues = Array.from(new Set(values.filter(Boolean)));

    // 3. 查询已存在的规格，避免重复插入
    const exists = await this.optionRepo.find({
      where: {
        attributeId,
        value: In(uniqueValues),
        tenantId,
      },
    });
    const existsSet = new Set(exists.map((opt) => opt.value));
    const toInsert = uniqueValues.filter((v) => !existsSet.has(v));

    // 4. 批量创建
    const options = toInsert.map((v) =>
      this.optionRepo.create({
        attribute: { id: attributeId },
        attributeId,
        value: v,
        tenantId,
      }),
    );
    if (options.length === 0) return { message: '全部已存在，无需新增' };

    // 5. 批量保存
    return await this.optionRepo.save(options);
  }

  /** 删除规格 **/
  async delete(id: string) {
    // 1. 校验归属权
    const option = await this.optionRepo.findOne({ where: { id } });
    if (!option) throw new BusinessException('规格不存在或无权操作');
    // 2. 删除
    return await this.optionRepo.remove(option);
  }

  /** 批量删除规格值 **/
  async batchDelete(ids: string[], tenantId: string) {
    if (!ids || ids.length === 0) {
      throw new BusinessException('请选择要删除的规格值');
    }

    // 查询所有要删除的规格值
    const options = await this.optionRepo.find({
      where: ids.map((id) => ({ id, tenantId })),
    });

    if (options.length === 0) {
      throw new BusinessException('未找到可删除的规格值');
    }

    // 批量删除
    await this.optionRepo.remove(options);
    return { message: `成功删除 ${options.length} 个规格值` };
  }
  /** 更改规格状态（启用/禁用） **/
  async updateStatus(id: string, isActive: number, tenantId: string) {
    // 校验归属权
    const option = await this.optionRepo.findOne({ where: { id, tenantId } });
    if (!option) throw new BusinessException('规格不存在或无权操作');
    option.isActive = isActive;
    await this.optionRepo.save(option);
    return { message: isActive ? '已启用' : '已禁用' };
  }
  /** * 2. 获取详情 (getDetail)
   * 满足“对称性”要求：返回结构与 SaveOptionDto 一致
   */
  async getDetail(id: string, tenantId: string) {
    const option = await this.optionRepo.findOne({
      where: { id, tenantId },
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
  async update(dto: SaveOptionDto, tenantId: string) {
    if (!dto.id) throw new BusinessException('缺少规格ID，无法更新');
    const option = await this.optionRepo.findOne({ where: { id: dto.id, tenantId } });
    if (!option) throw new BusinessException('规格不存在或无权操作');
    Object.assign(option, dto);
    await this.optionRepo.save(option);
    return option;
  }
}
