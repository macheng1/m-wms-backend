import { BusinessException } from '@/common/filters/business.exception';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMiniappPostDto, QueryMiniappPostDto } from './dto/miniapp-post.dto';
import { MiniappCategory } from './entities/miniapp-category.entity';
import { MiniappPost } from './entities/miniapp-post.entity';

@Injectable()
export class MiniappPostService {
  constructor(
    @InjectRepository(MiniappPost)
    private readonly postRepo: Repository<MiniappPost>,
    @InjectRepository(MiniappCategory)
    private readonly categoryRepo: Repository<MiniappCategory>,
  ) {}

  async create(dto: CreateMiniappPostDto, memberId?: string) {
    const categoryId = this.normalizeCategoryId(dto.categoryId || dto.categoriesId);
    if (!categoryId) throw new BusinessException('请选择分类');

    const category = await this.categoryRepo.findOne({ where: { id: categoryId, isActive: 1 } });
    if (!category) throw new BusinessException('分类不存在或已停用');

    const post = this.postRepo.create({
      categoryId,
      memberId: memberId || null,
      tenantId: null,
      title: dto.title || category.name,
      phone: dto.phone || null,
      content: dto.content,
      imgList: dto.imgList || null,
      status: 'pending',
    });

    return this.toPostView(await this.postRepo.save(post), category);
  }

  async findPublicPage(query: QueryMiniappPostDto) {
    const page = Number(query.page || query.pageNo || 1);
    const pageSize = Number(query.pageSize || 10);
    const categoryId = this.normalizeCategoryId(query.categoryId || query.categoriesId);

    const qb = this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndMapOne(
        'post.category',
        MiniappCategory,
        'category',
        'category.id = post.categoryId',
      )
      .where('post.status IN (:...statuses)', { statuses: ['published', 'pending'] });

    if (categoryId) {
      qb.andWhere('post.categoryId = :categoryId', { categoryId });
    }
    if (query.userid) {
      qb.andWhere('post.memberId = :memberId', { memberId: query.userid });
    }

    const [list, total] = await qb
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: list.map((item: MiniappPost & { category?: MiniappCategory }) =>
        this.toPostView(item, item.category),
      ),
      total,
      page,
      pageNo: page,
      pageSize,
    };
  }

  async getDetail(id: string) {
    const post = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndMapOne(
        'post.category',
        MiniappCategory,
        'category',
        'category.id = post.categoryId',
      )
      .where('post.id = :id', { id })
      .getOne();
    if (!post) throw new BusinessException('信息不存在');

    await this.postRepo.increment({ id }, 'viewNum', 1);
    post.viewNum = (post.viewNum || 0) + 1;
    return this.toPostView(
      post as MiniappPost & { category?: MiniappCategory },
      (post as any).category,
    );
  }

  private normalizeCategoryId(value?: string) {
    return value?.split(',')[0]?.trim();
  }

  private toPostView(post: MiniappPost, category?: MiniappCategory) {
    return {
      ...post,
      id: post.id,
      categoriesId: post.categoryId,
      categoriesName: category?.name || '',
      imgList: post.imgList ? post.imgList.split(',').filter(Boolean) : [],
      createTime: post.createdAt,
      isDel: post.status === 'offline' ? '1' : '0',
      isCollect: 0,
    };
  }
}
