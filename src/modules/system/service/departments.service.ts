import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { BusinessException } from '@/common/filters/business.exception';
import { Department } from '../entities/department.entity';
import { QueryDepartmentDto, SaveDepartmentDto } from '../entities/dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  async list(query: QueryDepartmentDto, user: any) {
    const where: any = this.getScopeWhere(user);
    if (query.deptName) where.deptName = Like(`%${query.deptName}%`);
    if (query.isActive !== undefined && Number(query.isActive) !== -1) where.isActive = Number(query.isActive);

    return this.departmentRepo.find({
      where,
      order: { parentId: 'ASC', orderNum: 'ASC', createdAt: 'ASC' },
    });
  }

  async tree(query: QueryDepartmentDto, user: any) {
    const list = await this.list(query, user);
    return this.buildTree(list);
  }

  async options(user: any) {
    const list = await this.departmentRepo.find({
      where: { ...this.getScopeWhere(user), isActive: 1 },
      order: { parentId: 'ASC', orderNum: 'ASC', createdAt: 'ASC' },
    });

    return this.buildTree(
      list.map((department) => ({
        ...department,
        label: department.deptName,
        value: department.id,
      })),
    );
  }

  async save(dto: SaveDepartmentDto, user: any) {
    const tenantId = this.getTenantId(user);
    const scopeWhere = this.getScopeWhere(user);

    const existing = await this.departmentRepo.findOne({
      where: { ...scopeWhere, deptCode: dto.deptCode },
    });
    if (existing && existing.id !== dto.id) {
      throw new BusinessException('部门编码已存在');
    }

    if (dto.id) {
      const entity = await this.departmentRepo.findOne({ where: { id: dto.id, ...scopeWhere } });
      if (!entity) throw new BusinessException('部门不存在');
      Object.assign(entity, {
        ...dto,
        parentId: dto.parentId || null,
        orderNum: Number(dto.orderNum || 0),
        isActive: Number(dto.isActive ?? 1),
      });
      return this.departmentRepo.save(entity);
    }

    return this.departmentRepo.save(
      this.departmentRepo.create({
        ...dto,
        tenantId,
        parentId: dto.parentId || null,
        orderNum: Number(dto.orderNum || 0),
        isActive: Number(dto.isActive ?? 1),
      }),
    );
  }

  async delete(id: string, user: any) {
    const scopeWhere = this.getScopeWhere(user);
    const entity = await this.departmentRepo.findOne({ where: { id, ...scopeWhere } });
    if (!entity) throw new BusinessException('部门不存在');

    const childCount = await this.departmentRepo.count({ where: { parentId: id, ...scopeWhere } });
    if (childCount > 0) {
      throw new BusinessException('存在下级部门，不允许删除');
    }

    await this.departmentRepo.delete({ id, ...scopeWhere });
    return { message: '删除成功' };
  }

  private getTenantId(user: any) {
    return user?.userType === 'platform' ? null : user?.tenantId;
  }

  private getScopeWhere(user: any) {
    return user?.userType === 'platform' ? { tenantId: IsNull() } : { tenantId: user?.tenantId };
  }

  private buildTree<T extends Department & { children?: T[] }>(list: T[], parentId: string | null = null): T[] {
    return list
      .filter((item) => (item.parentId || null) === parentId)
      .map((item) => {
        const children = this.buildTree(list, item.id);
        return children.length > 0 ? { ...item, children } : item;
      });
  }
}
