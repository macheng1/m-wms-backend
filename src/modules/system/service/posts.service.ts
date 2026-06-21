import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { BusinessException } from '@/common/filters/business.exception';
import { Post } from '../entities/post.entity';
import { QueryPostDto, SavePostDto } from '../entities/dto/post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
  ) {}

  async page(query: QueryPostDto, user: any) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const where: any = this.getScopeWhere(user);
    if (query.postCode) where.postCode = Like(`%${query.postCode}%`);
    if (query.postName) where.postName = Like(`%${query.postName}%`);
    if (query.isActive !== undefined && Number(query.isActive) !== -1) where.isActive = Number(query.isActive);

    const [list, total] = await this.postRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { postSort: 'ASC', createdAt: 'ASC' },
    });

    return { list, total, page, pageSize };
  }

  async options(user: any) {
    const list = await this.postRepo.find({
      where: { ...this.getScopeWhere(user), isActive: 1 },
      order: { postSort: 'ASC', createdAt: 'ASC' },
    });

    return list.map((post) => ({
      ...post,
      label: post.postName,
      value: post.id,
    }));
  }

  async save(dto: SavePostDto, user: any) {
    const tenantId = this.getTenantId(user);
    const scopeWhere = this.getScopeWhere(user);

    const existing = await this.postRepo.findOne({
      where: { ...scopeWhere, postCode: dto.postCode },
    });
    if (existing && existing.id !== dto.id) {
      throw new BusinessException('岗位编码已存在');
    }

    if (dto.id) {
      const entity = await this.postRepo.findOne({ where: { id: dto.id, ...scopeWhere } });
      if (!entity) throw new BusinessException('岗位不存在');
      Object.assign(entity, {
        ...dto,
        postSort: Number(dto.postSort || 0),
        isActive: Number(dto.isActive ?? 1),
      });
      return this.postRepo.save(entity);
    }

    return this.postRepo.save(
      this.postRepo.create({
        ...dto,
        tenantId,
        postSort: Number(dto.postSort || 0),
        isActive: Number(dto.isActive ?? 1),
      }),
    );
  }

  async delete(id: string, user: any) {
    const scopeWhere = this.getScopeWhere(user);
    const entity = await this.postRepo.findOne({ where: { id, ...scopeWhere } });
    if (!entity) throw new BusinessException('岗位不存在');
    await this.postRepo.delete({ id, ...scopeWhere });
    return { message: '删除成功' };
  }

  private getTenantId(user: any) {
    return user?.userType === 'platform' ? null : user?.tenantId;
  }

  private getScopeWhere(user: any) {
    return user?.userType === 'platform' ? { tenantId: IsNull() } : { tenantId: user?.tenantId };
  }
}
