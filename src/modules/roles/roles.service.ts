/* eslint-disable @typescript-eslint/no-unused-vars */
import { BusinessException } from '@/common/filters/business.exception';
import { CreateRoleDto, UpdateRoleDto } from './entities/dto/create-role.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { DataSource, In, Like, Repository } from 'typeorm';
import { QueryRoleDto } from './entities/dto/query-role.dto';
import { Menu } from '../auth/entities/menu.entity';
import { Department } from '../system/entities/department.entity';

// src/modules/roles/roles.service.ts
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly dataSource: DataSource,
  ) {}

  private async getTenantMenus(
    menuCodes: string[] = [],
    menuIds: number[] = [],
    tenantId: string,
  ): Promise<Menu[]> {
    if (menuCodes.length === 0 && menuIds.length === 0) {
      return [];
    }

    const selectedMenus = await this.menuRepository.find({
      where: {
        scope: 'tenant',
        ...(menuIds.length > 0 ? { id: In(menuIds) } : { code: In(menuCodes) }),
      },
    });

    const expectedValues = menuIds.length > 0 ? menuIds : menuCodes;
    if (selectedMenus.length !== expectedValues.length) {
      const existingCodes = new Set(selectedMenus.map((menu) => menu.code));
      const existingIds = new Set(selectedMenus.map((menu) => menu.id));
      const invalidValues =
        menuIds.length > 0
          ? menuIds.filter((id) => !existingIds.has(id))
          : menuCodes.filter((code) => !existingCodes.has(code));
      throw new BusinessException(`存在不可分配的租户菜单：${invalidValues.join(', ')}`);
    }

    const allTenantMenus = await this.menuRepository.find({
      where: {
        scope: 'tenant',
        type: In(['DIRECTORY', 'MENU', 'BUTTON']),
      },
    });
    const selectedIds = new Set(selectedMenus.map((menu) => Number(menu.id)));
    const expandedIds = new Set(selectedIds);
    const hasSelectedDescendant = (parentId: number): boolean =>
      allTenantMenus.some((menu) => {
        if (Number(menu.parentId || 0) !== parentId) return false;
        const id = Number(menu.id);
        return selectedIds.has(id) || hasSelectedDescendant(id);
      });
    const addDescendants = (parentId: number) => {
      allTenantMenus
        .filter((menu) => Number(menu.parentId || 0) === parentId)
        .forEach((menu) => {
          const id = Number(menu.id);
          if (expandedIds.has(id)) return;
          expandedIds.add(id);
          addDescendants(id);
        });
    };
    selectedMenus
      .filter((menu) => menu.type === 'DIRECTORY' && !hasSelectedDescendant(Number(menu.id)))
      .forEach((menu) => addDescendants(Number(menu.id)));
    const menus = allTenantMenus.filter((menu) => expandedIds.has(Number(menu.id)));

    const guardedMenuItems = menus.filter((menu) => menu.type === 'MENU' || menu.type === 'BUTTON');
    if (guardedMenuItems.length > 0) {
      const grantedRows: Array<{ code: string }> = await this.dataSource.query(
        `
          SELECT m.code
          FROM tenant_menu_permissions tmp
          INNER JOIN menus m ON m.id = tmp.menuId
          WHERE tmp.tenantId = ?
            AND m.scope = 'tenant'
            AND m.type IN ('MENU', 'BUTTON')
        `,
        [tenantId],
      );
      const grantedCodes = new Set(grantedRows.map((row) => row.code));
      const invalidMenuCodes = guardedMenuItems
        .filter((menu) => !grantedCodes.has(menu.code))
        .map((menu) => menu.code);

      if (invalidMenuCodes.length > 0) {
        throw new BusinessException(`存在未授权给该租户的菜单：${invalidMenuCodes.join(', ')}`);
      }
    }

    return menus;
  }

  async create(dto: CreateRoleDto, tenantId: string) {
    // 1. 唯一性检查：确保同一个厂家的角色名不重复
    const existing = await this.roleRepository.findOne({
      where: { name: dto.name, tenantId, scope: 'tenant' },
    });
    if (existing) throw new BusinessException('该角色名称在当前企业中已存在');

    // 2. 租户管理员只能为租户角色分配 tenant 域菜单。
    const menus = await this.getTenantMenus(dto.menuCodes, dto.menuIds, tenantId);
    const departments = await this.getDepartments(dto.deptIds, tenantId);

    // 3. 创建角色并关联查到的菜单实体
    const { menuCodes, menuIds, deptIds, scope, ...roleInfo } = dto;
    const role = this.roleRepository.create({
      ...roleInfo,
      scope: 'tenant',
      tenantId, // 强制注入租户 ID，保证数据隔离
      menus,
      departments,
      dataScope: dto.dataScope || 'ALL',
    });

    // 4. 保存角色
    // TypeORM 会自动处理 role_menus 中间表，将对应的 roleId 和 menuId 关联起来
    return await this.roleRepository.save(role);
  }

  // 2. 查询租户下所有角色
  // 分页查询逻辑
  async findAll(query: QueryRoleDto, tenantId: string) {
    const { page, pageSize, name, isActive, menuCodes } = query;

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
      relations: ['menus', 'departments'],
    };

    // menuCodes 过滤
    if (menuCodes && Array.isArray(menuCodes) && menuCodes.length > 0) {
      findOptions.relations = ['menus'];
      // 只能用QueryBuilder实现交集过滤
      const qb = this.roleRepository
        .createQueryBuilder('role')
        .leftJoinAndSelect('role.menus', 'menu')
        .where('role.tenantId = :tenantId', { tenantId })
        .andWhere('role.scope = :scope', { scope: 'tenant' })
        .andWhere('menu.code IN (:...menuCodes)', { menuCodes });

      if (name) {
        qb.andWhere('role.name LIKE :name', { name: `%${name}%` });
      }
      if (isActiveNum === 0 || isActiveNum === 1) {
        qb.andWhere('role.isActive = :isActive', { isActive: isActiveNum });
      }

      qb.skip((page - 1) * pageSize)
        .take(pageSize)
        .orderBy('role.id', 'DESC');

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

    // 增加 menuNames 字段
    const userCounts = await this.getRoleUserCounts(list.map((role) => role.id));
    const listWithNames = list.map((role) => ({
      ...role,
      menuNames: (role.menus || []).map((menu) => menu.name).join(', '),
      menuCodes: (role.menus || []).map((menu) => menu.code),
      menuIds: (role.menus || []).map((menu) => menu.id),
      deptIds: (role.departments || []).map((dept) => dept.id),
      userCount: userCounts.get(role.id) || 0,
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
    // 1. 先查找该租户下的角色，并显式加载 menus 关联
    const role = await this.roleRepository.findOne({
      where: { id, tenantId, scope: 'tenant' },
      relations: ['menus', 'departments'], // 必须加载关联，否则 TypeORM 无法正确对比差异进行更新
    });

    if (!role) {
      throw new BusinessException('角色不存在或无权操作');
    }

    // 2. 如果 DTO 中包含了菜单码数组，则进行转换
    if (dto.menuCodes || dto.menuIds) {
      role.menus = await this.getTenantMenus(dto.menuCodes, dto.menuIds, tenantId);
    }

    if (dto.deptIds) {
      role.departments = await this.getDepartments(dto.deptIds, tenantId);
    }

    // 3. 更新其他基础字段（如 name, remark, isActive）
    // 注意：不要直接 Object.assign(role, dto)，因为 dto 里的 menuCodes 是字符串数组
    const { menuCodes, menuIds, deptIds, scope, ...baseInfo } = dto;
    Object.assign(role, baseInfo, {
      scope: 'tenant',
      dataScope: dto.dataScope || role.dataScope || 'ALL',
    });

    // 4. 保存角色
    // TypeORM 会自动处理中间表 role_menus 的更新
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
    const role = await this.roleRepository.findOne({
      where: { id, tenantId, scope: 'tenant' },
      relations: ['menus', 'departments'],
    });
    if (!role) throw new BusinessException('角色不存在或无权操作');
    // 增加 menuCodes 字段
    return {
      ...role,
      menuCodes: (role.menus || []).map((menu) => menu.code),
      menuIds: (role.menus || []).map((menu) => menu.id),
      deptIds: (role.departments || []).map((dept) => dept.id),
    };
  }
  // 查询所有激活的角色（不分页）
  async selectRoleList(tenantId: string) {
    const list = await this.roleRepository.find({
      where: { tenantId, scope: 'tenant', isActive: 1 },
      order: { createdAt: 'ASC' },
      relations: ['menus'],
    });
    // 增加 menuNames 字段
    return list.map((role) => ({
      ...role,
    }));
  }

  async save(dto: UpdateRoleDto & { id?: string }, tenantId: string) {
    if (dto.id) {
      return this.update(dto.id, dto, tenantId);
    }

    return this.create(dto, tenantId);
  }

  async getMenuTree(tenantId: string) {
    const rows: Menu[] = await this.dataSource.query(
      `
        SELECT m.*
        FROM menus m
        LEFT JOIN tenant_menu_permissions tmp
          ON tmp.menuId = m.id AND tmp.tenantId = ?
        WHERE m.scope = 'tenant'
          AND m.isActive = 1
          AND m.type IN ('DIRECTORY', 'MENU', 'BUTTON')
          AND (m.type = 'DIRECTORY' OR tmp.menuId IS NOT NULL)
        ORDER BY m.parentId ASC, m.sortOrder ASC, m.id ASC
      `,
      [tenantId],
    );

    return this.buildMenuTree(rows);
  }

  private async getDepartments(deptIds: string[] = [], tenantId: string) {
    if (!deptIds.length) return [];

    const departments = await this.departmentRepository.find({
      where: { id: In(deptIds), tenantId },
    });
    if (departments.length !== deptIds.length) {
      throw new BusinessException('存在不可分配的数据权限部门');
    }

    return departments;
  }

  private async getRoleUserCounts(roleIds: string[]) {
    const countMap = new Map<string, number>();
    if (!roleIds.length) return countMap;

    const rows: Array<{ rolesId: string; count: string }> = await this.dataSource.query(
      `
        SELECT rolesId, COUNT(*) AS count
        FROM user_roles
        WHERE rolesId IN (?)
        GROUP BY rolesId
      `,
      [roleIds],
    );

    rows.forEach((row) => countMap.set(row.rolesId, Number(row.count)));
    return countMap;
  }

  private buildMenuTree(menus: Menu[], parentId = 0): Array<Menu & { children?: Menu[] }> {
    return menus
      .filter((menu) => Number(menu.parentId || 0) === parentId)
      .map((menu) => {
        const children = this.buildMenuTree(menus, menu.id);
        return children.length > 0 ? { ...menu, children } : menu;
      });
  }
}
