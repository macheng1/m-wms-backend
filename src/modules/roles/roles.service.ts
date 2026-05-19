/* eslint-disable @typescript-eslint/no-unused-vars */
import { BusinessException } from '@/common/filters/business.exception';
import { CreateRoleDto, UpdateRoleDto } from './entities/dto/create-role.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { DataSource, In, Like, Repository } from 'typeorm';
import { QueryRoleDto } from './entities/dto/query-role.dto';
import { Permission } from '../auth/entities/permission.entity';

// src/modules/roles/roles.service.ts
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly dataSource: DataSource,
  ) {}

  private async getTenantPermissions(
    permissionCodes: string[] = [],
    tenantId: string,
  ): Promise<Permission[]> {
    if (permissionCodes.length === 0) {
      return [];
    }

    const permissions = await this.permissionRepository.find({
      where: {
        code: In(permissionCodes),
        scope: 'tenant',
      },
    });

    if (permissions.length !== permissionCodes.length) {
      const existingCodes = new Set(permissions.map((permission) => permission.code));
      const invalidCodes = permissionCodes.filter((code) => !existingCodes.has(code));
      throw new BusinessException(`存在不可分配的租户权限：${invalidCodes.join(', ')}`);
    }

    const menuPermissions = permissions.filter((permission) => permission.type === 'MENU');
    if (menuPermissions.length > 0) {
      const grantedRows: Array<{ code: string }> = await this.dataSource.query(
        `
          SELECT p.code
          FROM tenant_menu_permissions tmp
          INNER JOIN permissions p ON p.id = tmp.permissionsId
          WHERE tmp.tenantId = ?
            AND p.scope = 'tenant'
            AND p.type = 'MENU'
        `,
        [tenantId],
      );
      const grantedCodes = new Set(grantedRows.map((row) => row.code));
      const invalidMenuCodes = menuPermissions
        .map((permission) => permission.code)
        .filter((code) => !grantedCodes.has(code));

      if (invalidMenuCodes.length > 0) {
        throw new BusinessException(`存在未授权给该租户的菜单：${invalidMenuCodes.join(', ')}`);
      }
    }

    return permissions;
  }

  async create(dto: CreateRoleDto, tenantId: string) {
    // 1. 唯一性检查：确保同一个厂家的角色名不重复
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name, tenantId, scope: 'tenant' },
    });
    if (existing) throw new BusinessException('该角色名称在当前企业中已存在');

    // 2. 租户管理员只能为租户角色分配 tenant 域权限。
    const permissions = await this.getTenantPermissions(dto.permissionCodes, tenantId);

    // 3. 创建角色并关联查到的权限实体
    const { permissionCodes, scope, ...roleInfo } = dto;
    const role = this.roleRepository.create({
      ...roleInfo,
      scope: 'tenant',
      tenantId, // 强制注入租户 ID，保证数据隔离
      permissions, // 绑定权限实体对象数组
    });

    // 4. 保存角色
    // TypeORM 会自动处理 role_permissions 中间表，将对应的 roleId 和 permissionId 关联起来
    return await this.roleRepository.save(role);
  }

  // 2. 查询租户下所有角色
  // 分页查询逻辑
  async findAll(query: QueryRoleDto, tenantId: string) {
    const { page, pageSize, name, isActive, permissionCodes } = query;

    // 构建查询条件
    const where: any = { tenantId, scope: 'tenant' };
    if (name) {
      where.name = Like(`%${name}%`); // 模糊匹配角色名
    }
    const isActiveNum = Number(isActive);
    if (isActiveNum === 0 || isActiveNum === 1) {
      where.isActive = isActiveNum;
    }

    // 构建查询选项
    const findOptions: any = {
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { id: 'ASC' },
      relations: ['permissions'],
    };

    // permissionCodes 过滤
    if (permissionCodes && Array.isArray(permissionCodes) && permissionCodes.length > 0) {
      findOptions.relations = ['permissions'];
      // 只能用QueryBuilder实现交集过滤
      const qb = this.roleRepository
        .createQueryBuilder('role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where('role.tenantId = :tenantId', { tenantId })
        .andWhere('role.scope = :scope', { scope: 'tenant' })
        .andWhere('permission.code IN (:...permissionCodes)', { permissionCodes });

      if (name) {
        qb.andWhere('role.name LIKE :name', { name: `%${name}%` });
      }
      if (isActiveNum === 0 || isActiveNum === 1) {
        qb.andWhere('role.isActive = :isActive', { isActive: isActiveNum });
      }

      qb.skip((page - 1) * pageSize).take(pageSize).orderBy('role.id', 'DESC');

      const [list, total] = await qb.getManyAndCount();
      return {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    const [list, total] = await this.roleRepository.findAndCount(findOptions);

    // 增加 permissionsNames 字段
    const listWithNames = list.map((role) => ({
      ...role,
      permissionsNames: (role.permissions || []).map((p) => p.name).join(', '),
    }));
    return {
      list: listWithNames,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 更新逻辑 (确保 tenantId 安全隔离)
  async update(id: string, dto: UpdateRoleDto, tenantId: string) {
    // 1. 先查找该租户下的角色，并显式加载 permissions 关联
    const role = await this.roleRepository.findOne({
      where: { id, tenantId, scope: 'tenant' },
      relations: ['permissions'], // 必须加载关联，否则 TypeORM 无法正确对比差异进行更新
    });

    if (!role) {
      throw new BusinessException('角色不存在或无权操作');
    }

    // 2. 如果 DTO 中包含了权限码数组，则进行转换
    if (dto.permissionCodes) {
      role.permissions = await this.getTenantPermissions(dto.permissionCodes, tenantId);
    }

    // 3. 更新其他基础字段（如 name, remark, isActive）
    // 注意：不要直接 Object.assign(role, dto)，因为 dto 里的 permissionCodes 是字符串数组
    const { permissionCodes, scope, ...baseInfo } = dto;
    Object.assign(role, baseInfo, { scope: 'tenant' });

    // 4. 保存角色
    // TypeORM 会自动处理中间表 role_permissions 的更新
    return await this.roleRepository.save(role);
  }
  // 4. 删除角色
  async remove(id: string, tenantId: string) {
    const role = await this.findOne(id, tenantId);
    return await this.roleRepository.remove(role);
  }
  async updateStatus(id: string, isActive: number, tenantId: string) {
    // 1. 查找并确认归属权，防止越权操作其他工厂的角色
    const role = await this.roleRepository.findOne({
      where: { id, tenantId, scope: 'tenant' },
    });

    if (!role) {
      throw new BusinessException('角色不存在或无权操作', 10004);
    }

    // 2. 执行状态更新
    role.isActive = isActive;

    // 3. 保存并返回结果
    const updatedRole = await this.roleRepository.save(role);

    return {
      id: updatedRole.id,
      isActive: updatedRole.isActive,
      message: isActive ? '角色已启用' : '角色已禁用',
    };
  }
  // 辅助方法：确保查询时不跨租户
  async findOne(id: string, tenantId: string) {
    console.log('🚀 ~ RolesService ~ findOne ~ tenantId:', tenantId);
    const role = await this.roleRepository.findOne({
      where: { id, tenantId, scope: 'tenant' },
      relations: ['permissions'],
    });
    if (!role) throw new BusinessException('角色不存在或无权操作');
    // 增加 permissionCodes 字段
    return {
      ...role,
      permissionCodes: (role.permissions || []).map((p) => p.code),
    };
  }
  // 查询所有激活的角色（不分页）
  async selectRoleList(tenantId: string) {
    console.log('🚀 ~ RolesService ~ selectRoleList ~ tenantId:', tenantId);
    const list = await this.roleRepository.find({
      where: { tenantId, scope: 'tenant', isActive: 1 },
      order: { createdAt: 'ASC' },
      relations: ['permissions'],
    });
    // 增加 permissionsNames 字段
    return list.map((role) => ({
      ...role,
    }));
  }
}
