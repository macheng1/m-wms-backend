import { BusinessException } from '@/common/filters/business.exception';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { QueryMiniappBannerDto, SaveMiniappBannerDto } from './dto/miniapp-banner.dto';
import { MiniappBanner } from './entities/miniapp-banner.entity';

@Injectable()
export class MiniappBannerService {
  constructor(
    @InjectRepository(MiniappBanner)
    private readonly bannerRepo: Repository<MiniappBanner>,
  ) {}

  async findPage(query: QueryMiniappBannerDto) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const qb = this.bannerRepo.createQueryBuilder('banner');

    if (query.keyword) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('banner.title LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('banner.linkValue LIKE :keyword', { keyword: `%${query.keyword}%` });
        }),
      );
    }

    const activeValue = Number(query.isActive);
    if (activeValue === 0 || activeValue === 1) {
      qb.andWhere('banner.isActive = :isActive', { isActive: activeValue });
    }

    const [list, total] = await qb
      .orderBy('banner.sortOrder', 'ASC')
      .addOrderBy('banner.createdAt', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async findActiveList() {
    return this.bannerRepo.find({
      where: { isActive: 1 },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async save(dto: SaveMiniappBannerDto) {
    const banner = dto.id
      ? await this.bannerRepo.findOne({ where: { id: dto.id } })
      : this.bannerRepo.create();
    if (!banner) throw new BusinessException('轮播图不存在');

    Object.assign(banner, {
      title: dto.title.trim(),
      imageUrl: dto.imageUrl,
      linkType: dto.linkType || 'none',
      linkValue: dto.linkValue || null,
      sortOrder: Number(dto.sortOrder || 0),
      isActive: dto.isActive ?? 1,
    });

    return this.bannerRepo.save(banner);
  }

  async updateStatus(id: string, isActive: number) {
    const res = await this.bannerRepo.update({ id }, { isActive });
    if (res.affected === 0) throw new BusinessException('轮播图不存在');
    return { message: '状态已更新' };
  }

  async remove(id: string) {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) throw new BusinessException('轮播图不存在');
    await this.bannerRepo.softRemove(banner);
    return { message: '已删除' };
  }
}
