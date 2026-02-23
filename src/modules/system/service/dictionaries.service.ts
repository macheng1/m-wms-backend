import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  async getOptionsByType(type: string) {
    const list = await this.dictRepo.find({
      where: { type, isActive: 1 },
      order: { sort: 'ASC' },
    });

    // 映射为前端组件直接可用的结构
    return list.map((item) => ({
      label: item.label,
      value: item.value,
      id: item.id, // 额外保留 ID 以便特殊操作
    }));
  }

  /**
   * 保存字典项
   * 字典为平台级数据，tenantId 设置为 null
   */
  async save(dto: SaveDictDto) {
    const entity = this.dictRepo.create({ ...dto, tenantId: null });
    return this.dictRepo.save(entity);
  }

  /**
   * 删除字典项
   * 字典为平台级数据，不需要租户验证
   */
  async delete(id: string) {
    return this.dictRepo.delete({ id });
  }

  /**
   * 分页查询字典列表
   * 字典为平台级数据，不进行租户隔离
   */
  async list(type: string, page: number, pageSize: number) {
    const where: any = {};
    if (type) {
      where.type = type;
    }

    const [list, total] = await this.dictRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { sort: 'ASC', createdAt: 'DESC' },
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
  async update(dto: UpdateDictDto) {
    const { id, ...updateData } = dto;

    // 检查记录是否存在
    const dict = await this.dictRepo.findOne({ where: { id } });
    if (!dict) {
      throw new BusinessException('字典项不存在');
    }

    // 执行更新
    await this.dictRepo.update({ id }, updateData);

    // 返回更新后的最新数据
    return this.dictRepo.findOne({ where: { id } });
  }
}
