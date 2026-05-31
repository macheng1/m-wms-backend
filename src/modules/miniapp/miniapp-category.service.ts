import { BusinessException } from '@/common/filters/business.exception';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Not, Repository } from 'typeorm';
import { QueryMiniappCategoryDto, SaveMiniappCategoryDto } from './dto/miniapp-category.dto';
import { MiniappCategory } from './entities/miniapp-category.entity';

@Injectable()
export class MiniappCategoryService {
  constructor(
    @InjectRepository(MiniappCategory)
    private readonly categoryRepo: Repository<MiniappCategory>,
  ) {}

  async findPage(query: QueryMiniappCategoryDto) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const qb = this.categoryRepo.createQueryBuilder('category').where('category.deletedAt IS NULL');

    if (query.keyword) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('category.name LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('category.code LIKE :keyword', { keyword: `%${query.keyword}%` });
        }),
      );
    }

    const activeValue = Number(query.isActive);
    if (activeValue === 0 || activeValue === 1) {
      qb.andWhere('category.isActive = :isActive', { isActive: activeValue });
    }

    const [list, total] = await qb
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.createdAt', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async findActiveList() {
    return this.categoryRepo.find({
      where: { isActive: 1, deletedAt: IsNull() },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async save(dto: SaveMiniappCategoryDto) {
    const code = dto.code?.trim() || this.generateCode(dto.name);
    const exists = await this.categoryRepo.findOne({
      where: { code, ...(dto.id ? { id: Not(dto.id) } : {}) },
    });
    if (exists) throw new BusinessException('分类编码已存在');

    const category = dto.id
      ? await this.categoryRepo.findOne({ where: { id: dto.id } })
      : this.categoryRepo.create();
    if (!category) throw new BusinessException('分类不存在');

    Object.assign(category, {
      name: dto.name.trim(),
      code,
      iconUrl: dto.iconUrl || null,
      linkUrl: dto.linkUrl || null,
      description: dto.description || null,
      sortOrder: Number(dto.sortOrder || 0),
      isActive: dto.isActive ?? 1,
    });

    return this.categoryRepo.save(category);
  }

  async updateStatus(id: string, isActive: number) {
    const res = await this.categoryRepo.update({ id }, { isActive });
    if (res.affected === 0) throw new BusinessException('分类不存在');
    return { message: '状态已更新' };
  }

  async remove(id: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new BusinessException('分类不存在');
    category.isActive = 0;
    await this.categoryRepo.softRemove(category);
    return { message: '分类已删除' };
  }

  private generateCode(name: string) {
    return `miniapp_${Buffer.from(name).toString('hex').slice(0, 16)}`;
  }
}
