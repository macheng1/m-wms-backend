import { BusinessException } from '@/common/filters/business.exception';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  CreateMiniappPostDto,
  QueryMiniappPostDto,
  UpdateMiniappPostStatusDto,
} from './dto/miniapp-post.dto';
import { MiniappCategory } from './entities/miniapp-category.entity';
import { MiniappMember } from './entities/miniapp-member.entity';
import { MiniappPostCollection } from './entities/miniapp-post-collection.entity';
import { MiniappPost } from './entities/miniapp-post.entity';
import { MiniappPostView } from './entities/miniapp-post-view.entity';

@Injectable()
export class MiniappPostService {
  constructor(
    @InjectRepository(MiniappPost)
    private readonly postRepo: Repository<MiniappPost>,
    @InjectRepository(MiniappCategory)
    private readonly categoryRepo: Repository<MiniappCategory>,
    @InjectRepository(MiniappMember)
    private readonly memberRepo: Repository<MiniappMember>,
    @InjectRepository(MiniappPostCollection)
    private readonly collectionRepo: Repository<MiniappPostCollection>,
    @InjectRepository(MiniappPostView)
    private readonly postViewRepo: Repository<MiniappPostView>,
  ) {}

  async create(dto: CreateMiniappPostDto, memberId?: string) {
    const categoryId = this.normalizeCategoryId(dto.categoryId || dto.categoriesId);
    const category = await this.resolveCategory(categoryId);

    const member = memberId ? await this.memberRepo.findOne({ where: { id: memberId } }) : null;
    const post = this.postRepo.create({
      categoryId: category.id,
      memberId: memberId || null,
      tenantId: member?.tenantId || null,
      title: dto.title || null,
      phone: dto.phone || null,
      content: dto.content,
      structuredData: this.normalizeStructuredData(dto.structuredData),
      region: dto.region || this.extractRegion(dto.structuredData) || null,
      imgList: dto.imgList || null,
      status: 'pending',
    });

    return this.toPostView(await this.postRepo.save(post), category, member);
  }

  async findPublicPage(query: QueryMiniappPostDto, memberId?: string) {
    return this.findPage(query, { publicOnly: true, memberId });
  }

  async findAdminPage(query: QueryMiniappPostDto) {
    return this.findPage(query, { publicOnly: false });
  }

  async findMyPage(query: QueryMiniappPostDto, memberId: string) {
    return this.findPage(
      { ...query, userid: memberId, status: query.status || 'all' },
      { publicOnly: false, memberId, excludeOffline: true },
    );
  }

  private async findPage(
    query: QueryMiniappPostDto,
    options: { publicOnly: boolean; memberId?: string; excludeOffline?: boolean },
  ) {
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
      .leftJoinAndMapOne(
        'post.member',
        MiniappMember,
        'member',
        'member.id = post.memberId',
      )
      .where('1 = 1');

    if (options.publicOnly) {
      qb.andWhere('post.status = :published', { published: 'published' });
    } else if (query.status && query.status !== 'all') {
      qb.andWhere('post.status = :status', { status: query.status });
    } else if (options.excludeOffline) {
      qb.andWhere('post.status != :offline', { offline: 'offline' });
    }

    if (categoryId) {
      qb.andWhere('post.categoryId = :categoryId', { categoryId });
    }
    if (query.userid) {
      qb.andWhere('post.memberId = :memberId', { memberId: query.userid });
    }
    if (query.keyword) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('post.title LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('post.content LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('post.phone LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('category.name LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('member.nickName LIKE :keyword', { keyword: `%${query.keyword}%` });
        }),
      );
    }
    if (query.region) {
      qb.andWhere('post.region LIKE :region', { region: `%${query.region}%` });
    }
    if (this.isTruthy(query.certifiedOnly)) {
      qb.andWhere('member.tenantBindStatus = :approved', { approved: 'approved' });
    }

    const [list, total] = await qb
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: await Promise.all(
        list.map((item: MiniappPost & { category?: MiniappCategory; member?: MiniappMember }) =>
          this.toPostView(item, item.category, item.member, options.memberId),
        ),
      ),
      total,
      page,
      pageNo: page,
      pageSize,
    };
  }

  async getDetail(
    id: string,
    memberId?: string,
    increaseView = false,
    viewContext?: { ip?: string | null; userAgent?: string | null },
  ) {
    const post = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndMapOne(
        'post.category',
        MiniappCategory,
        'category',
        'category.id = post.categoryId',
      )
      .leftJoinAndMapOne(
        'post.member',
        MiniappMember,
        'member',
        'member.id = post.memberId',
      )
      .where('post.id = :id', { id })
      .getOne();
    if (!post) throw new BusinessException('信息不存在');

    if (increaseView) {
      await this.postRepo.increment({ id }, 'viewNum', 1);
      await this.postViewRepo.save(
        this.postViewRepo.create({
          postId: id,
          memberId: memberId || null,
          ip: viewContext?.ip || null,
          userAgent: viewContext?.userAgent || null,
        }),
      );
      post.viewNum = (post.viewNum || 0) + 1;
    }
    return this.toPostView(
      post as MiniappPost & { category?: MiniappCategory },
      (post as any).category,
      (post as any).member,
      memberId,
    );
  }

  async updateStatus(id: string, dto: UpdateMiniappPostStatusDto) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new BusinessException('信息不存在');
    post.status = dto.status;
    post.auditRemark = dto.auditRemark || null;
    post.auditedAt = new Date();
    return this.toPostView(await this.postRepo.save(post));
  }

  async resubmitMine(id: string, dto: CreateMiniappPostDto, memberId: string) {
    const post = await this.postRepo.findOne({ where: { id, memberId } });
    if (!post) throw new BusinessException('信息不存在');
    if (post.status === 'published') {
      throw new BusinessException('已审核通过的信息无需重新提交');
    }

    const categoryId = this.normalizeCategoryId(dto.categoryId || dto.categoriesId);
    const category = await this.resolveCategory(categoryId);

    post.categoryId = category.id;
    post.title = dto.title || null;
    post.phone = dto.phone || null;
    post.content = dto.content;
    post.structuredData = this.normalizeStructuredData(dto.structuredData);
    post.region = dto.region || this.extractRegion(dto.structuredData) || null;
    post.imgList = dto.imgList || null;
    post.status = 'pending';
    post.auditRemark = null;
    post.auditedAt = null;

    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    return this.toPostView(await this.postRepo.save(post), category, member);
  }

  async removeMine(id: string, memberId: string) {
    const post = await this.postRepo.findOne({ where: { id, memberId } });
    if (!post) throw new BusinessException('信息不存在');
    post.status = 'offline';
    await this.postRepo.save(post);
    return { message: '信息已删除' };
  }

  async addCollect(id: string, memberId: string) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post || post.status !== 'published') throw new BusinessException('信息不存在或未发布');
    const exists = await this.collectionRepo.findOne({ where: { postId: id, memberId } });
    if (!exists) {
      await this.collectionRepo.save(this.collectionRepo.create({ postId: id, memberId }));
    }
    return { message: '收藏成功' };
  }

  async cancelCollect(id: string, memberId: string) {
    await this.collectionRepo.delete({ postId: id, memberId });
    return { message: '已取消收藏' };
  }

  async findCollectPage(query: QueryMiniappPostDto, memberId: string) {
    const page = Number(query.page || query.pageNo || 1);
    const pageSize = Number(query.pageSize || 10);
    const qb = this.collectionRepo
      .createQueryBuilder('collection')
      .innerJoinAndMapOne('collection.post', MiniappPost, 'post', 'post.id = collection.postId')
      .leftJoinAndMapOne('post.category', MiniappCategory, 'category', 'category.id = post.categoryId')
      .leftJoinAndMapOne('post.member', MiniappMember, 'member', 'member.id = post.memberId')
      .where('collection.memberId = :memberId', { memberId })
      .andWhere('post.status = :status', { status: 'published' });

    const [rows, total] = await qb
      .orderBy('collection.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: await Promise.all(
        rows.map((row: MiniappPostCollection & { post?: MiniappPost }) =>
          this.toPostView((row as any).post, (row as any).post?.category, (row as any).post?.member, memberId),
        ),
      ),
      total,
      page,
      pageNo: page,
      pageSize,
    };
  }

  private normalizeCategoryId(value?: string) {
    return value?.split(',')[0]?.trim();
  }

  private async resolveCategory(categoryId?: string) {
    if (categoryId) {
      const category = await this.categoryRepo.findOne({ where: { id: categoryId, isActive: 1 } });
      if (!category) throw new BusinessException('分类不存在或已停用');
      return category;
    }
    const category = await this.categoryRepo.findOne({
      where: { isActive: 1 },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (!category) throw new BusinessException('请先配置发布分类');
    return category;
  }

  private async toPostView(
    post: MiniappPost,
    category?: MiniappCategory,
    member?: MiniappMember | null,
    currentMemberId?: string,
  ) {
    const isCollect = currentMemberId
      ? await this.collectionRepo.exists({ where: { postId: post.id, memberId: currentMemberId } })
      : false;
    return {
      ...post,
      id: post.id,
      categoriesId: post.categoryId,
      categoriesName: category?.name || '',
      imgList: post.imgList ? post.imgList.split(',').filter(Boolean) : [],
      createTime: post.createdAt,
      isDel: post.status === 'offline' ? '1' : '0',
      isCollect: isCollect ? 1 : 0,
      nickName: member?.nickName || '匿名用户',
      headPic: member?.avatarUrl || '',
      isEnterpriseNo: member?.tenantBindStatus === 'approved' ? '1' : '0',
      templateFields: category?.templateFields || [],
    };
  }

  private normalizeStructuredData(value?: Record<string, any> | string) {
    if (!value) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      try {
        return JSON.parse(trimmed);
      } catch (error) {
        throw new BusinessException('结构化字段必须是 JSON');
      }
    }
    return value;
  }

  private extractRegion(value?: Record<string, any> | string) {
    const data = this.normalizeStructuredData(value);
    return data?.region || data?.area || data?.district || data?.city || '';
  }

  private isTruthy(value?: string | number | boolean) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }
}
