import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Dictionary } from '../entities/dictionary.entity';
import { SaveDictDto, UpdateDictDto } from '../entities/dto/dict.dto';
import { BusinessException } from '@/common/filters/business.exception';

@Injectable()
export class DictionariesService {
  constructor(
    @InjectRepository(Dictionary)
    private readonly dictRepo: Repository<Dictionary>,
  ) {}

  /**
   * 根据类型获取字典列表 (核心：返回 {label, value} 格式)
   * 字典为平台级数据，不进行租户隔离
   */
  async getOptionsByType(type: string, tenantId?: string | null) {
    const list = await this.dictRepo.find({
      where: tenantId
        ? [
            { type, isActive: 1, scope: 'platform', tenantId: IsNull() },
            { type, isActive: 1, scope: 'tenant', tenantId },
          ]
        : { type, isActive: 1, scope: 'platform', tenantId: IsNull() },
      order: { sort: 'ASC', createdAt: 'ASC' },
    });

    // 映射为前端组件直接可用的结构
    return list.map((item) => ({
      label: item.label,
      value: item.value,
      id: item.id, // 额外保留 ID 以便特殊操作
      scope: item.scope,
    }));
  }

  /**
   * 保存字典项
   * 字典为平台级数据，tenantId 设置为 null
   */
  async save(dto: SaveDictDto, user?: any) {
    const scope = user?.userType === 'platform' ? dto.scope || 'platform' : 'tenant';
    const tenantId = scope === 'tenant' ? user?.tenantId || null : null;

    if (scope === 'tenant' && !tenantId) {
      throw new BusinessException('租户字典缺少租户上下文');
    }

    const entity = this.dictRepo.create({
      ...dto,
      scope,
      tenantId,
      isActive: dto.isActive ?? 1,
      isSystem: scope === 'platform' ? dto.isSystem ?? 0 : 0,
      allowTenantExtend: scope === 'platform' ? dto.allowTenantExtend ?? 0 : 0,
      allowTenantOverride: scope === 'platform' ? dto.allowTenantOverride ?? 0 : 0,
      parentId: dto.parentId || null,
    });
    return this.dictRepo.save(entity);
  }

  /**
   * 删除字典项
   * 字典为平台级数据，不需要租户验证
   */
  async delete(id: string, user?: any) {
    const dict = await this.findManageableDict(id, user);
    if (dict.isSystem === 1) {
      throw new BusinessException('系统内置字典不允许删除');
    }
    return this.dictRepo.delete({ id });
  }

  /**
   * 分页查询字典列表
   * 字典为平台级数据，不进行租户隔离
   */
  async list(type: string, page: number, pageSize: number, user?: any, scope?: 'platform' | 'tenant') {
    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (user?.userType === 'platform') {
      where.scope = scope || 'platform';
      if (where.scope === 'platform') {
        where.tenantId = IsNull();
      }
    } else {
      where.scope = 'tenant';
      where.tenantId = user?.tenantId;
    }

    const [list, total] = await this.dictRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { sort: 'ASC', createdAt: 'ASC' },
    });

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 更新字典项
   * 字典为平台级数据，不需要租户验证
   */
  async update(dto: UpdateDictDto, user?: any) {
    const { id, ...updateData } = dto;

    // 检查记录是否存在
    const dict = await this.findManageableDict(id, user);

    // 执行更新
    const nextData: any = { ...updateData };
    if (user?.userType !== 'platform') {
      delete nextData.scope;
      delete nextData.isSystem;
      delete nextData.allowTenantExtend;
      delete nextData.allowTenantOverride;
      delete nextData.parentId;
    }
    if (dict.scope === 'platform') {
      nextData.tenantId = null;
    }
    await this.dictRepo.update({ id }, nextData);

    // 返回更新后的最新数据
    return this.dictRepo.findOne({ where: { id } });
  }

  async types(user?: any) {
    const rows: Array<{ type: string; count: string }> = await this.dictRepo
      .createQueryBuilder('dict')
      .select('dict.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(user?.userType === 'platform' ? 'dict.scope = :scope' : 'dict.scope = :scope AND dict.tenantId = :tenantId', {
        scope: user?.userType === 'platform' ? 'platform' : 'tenant',
        tenantId: user?.tenantId,
      })
      .groupBy('dict.type')
      .orderBy('dict.type', 'ASC')
      .getRawMany();

    return rows.map((row) => ({ type: row.type, typeName: row.type, count: Number(row.count || 0) }));
  }

  private async findManageableDict(id: string, user?: any) {
    const where: any = { id };
    if (user?.userType === 'platform') {
      where.scope = 'platform';
      where.tenantId = IsNull();
    } else {
      where.scope = 'tenant';
      where.tenantId = user?.tenantId;
    }

    const dict = await this.dictRepo.findOne({ where });
    if (!dict) {
      throw new BusinessException('字典项不存在或无权操作');
    }
    return dict;
  }
}
