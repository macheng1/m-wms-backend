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
   */
  async getOptionsByType(type: string, tenantId: string) {
    const list = await this.dictRepo.find({
      where: { type, tenantId, isActive: 1 },
      order: { sort: 'ASC' },
    });

    // 映射为前端组件直接可用的结构
    return list.map((item) => ({
      label: item.label,
      value: item.value,
      id: item.id, // 额外保留 ID 以便特殊操作
    }));
  }

  async save(dto: SaveDictDto, tenantId: string) {
    const entity = this.dictRepo.create({ ...dto, tenantId });
    return this.dictRepo.save(entity);
  }

  async delete(id: string, tenantId: string) {
    return this.dictRepo.delete({ id, tenantId });
  }
  /**
   * 更新字典项
   * @param dto 更新数据
   * @param tenantId 租户ID (安全检查)
   */
  async update(dto: UpdateDictDto, tenantId: string) {
    const { id, ...updateData } = dto;

    // 1. 安全检查：确保该记录存在且属于该租户
    const dict = await this.dictRepo.findOne({ where: { id, tenantId } });
    if (!dict) {
      throw new BusinessException('字典项不存在或无权修改');
    }

    // 2. 执行更新
    await this.dictRepo.update({ id, tenantId }, updateData);

    // 3. 返回更新后的最新数据
    return this.dictRepo.findOne({ where: { id, tenantId } });
  }
}
