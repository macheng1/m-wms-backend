// src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Like, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs'; // 修复导入，确保运行时可用
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Department } from '../system/entities/department.entity';
import { Post } from '../system/entities/post.entity';
import { BusinessException } from '@/common/filters/business.exception';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password-dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. 获取当前登录用户自画像 (getUserInfo)
   */
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.menus', 'tenant', 'department', 'post'],
    });

    if (!user) throw new NotFoundException('该用户不存在');

    // 权限扁平化：平台超级管理员/租户管理员返回通配符，其余用户按角色权限返回。
    // 注意：只有“启用”的角色才参与权限判定，禁用的角色不应再放行任何菜单/按钮。
    const activeRoles = (user.roles || []).filter((r) => r.isActive === 1);
    const isPlatformSuperAdmin =
      user.isPlatformAdmin === 1 && activeRoles.some((r) => r.code === 'PLATFORM_ADMIN');
    const isTenantAdmin = activeRoles.some((r) => r.code === 'ADMIN');
    const menuAuth = await this.resolveUserMenuAuth(
      user,
      activeRoles,
      isPlatformSuperAdmin,
      isTenantAdmin,
    );

    // 新增：角色名称数组
    const roleNames = user.roles?.map((r) => r.name) || [];
    const roleIds = user.roles?.map((r) => r.id) || [];

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      realName: user.realName,
      userType: user.isPlatformAdmin === 1 ? 'platform' : 'tenant',
      tenantId: user.tenantId,
      tenantName: user.tenant?.name || '系统运营',
      deptId: user.deptId,
      deptName: user.department?.deptName || null,
      postId: user.postId,
      postName: user.post?.postName || null,
      menus: menuAuth.menus,
      butAuths: menuAuth.butAuths,
      roleIds,
      roleNames,
    };
  }

  private async resolveUserMenuAuth(
    user: User,
    activeRoles: Role[],
    isPlatformSuperAdmin: boolean,
    isTenantAdmin: boolean,
  ) {
    const scope = user.tenantId ? 'tenant' : 'platform';
    const allowedCodes = new Set<string>();

    if (!isPlatformSuperAdmin) {
      if (user.tenantId) {
        const grantedRows: Array<{ code: string }> = await this.dataSource.query(
          `
            SELECT m.code
            FROM tenant_menu_permissions tmp
            INNER JOIN menus m ON m.id = tmp.menuId
            WHERE tmp.tenantId = ?
              AND m.scope = 'tenant'
              AND m.type IN ('MENU', 'BUTTON')
          `,
          [user.tenantId],
        );
        const grantedMenuCodes = new Set(grantedRows.map((row) => row.code));

        if (isTenantAdmin) {
          grantedMenuCodes.forEach((code) => allowedCodes.add(code));
          activeRoles.forEach((role) => {
            role.menus
              .filter(
                (menu) =>
                  !['MENU', 'BUTTON'].includes(menu.type) || grantedMenuCodes.has(menu.code),
              )
              .forEach((menu) => allowedCodes.add(menu.code));
          });
        } else {
          activeRoles.forEach((role) => {
            role.menus
              .filter(
                (menu) =>
                  !['MENU', 'BUTTON'].includes(menu.type) || grantedMenuCodes.has(menu.code),
              )
              .forEach((menu) => allowedCodes.add(menu.code));
          });
        }
      } else {
        activeRoles.forEach((role) => {
          role.menus.forEach((menu) => allowedCodes.add(menu.code));
        });
      }
    }

    const rows = await this.dataSource.query(
      `
        SELECT id, code, name, type, routePath, componentPath, icon, parentId, sortOrder, isHidden
        FROM menus
        WHERE scope = ?
          AND isActive = 1
          AND type IN ('DIRECTORY', 'MENU', 'BUTTON')
        ORDER BY parentId ASC, sortOrder ASC, id ASC
      `,
      [scope],
    );
    // 授权数据允许只存子菜单/按钮；返回给前端菜单树时补齐祖先节点，避免有权限的子菜单挂不上去。
    this.addAncestorMenuCodes(rows, allowedCodes);

    const canUse = (menu: any) => isPlatformSuperAdmin || allowedCodes.has(menu.code);
    const visibleRows = rows.filter((menu: any) => Number(menu.isHidden || 0) === 0);
    return {
      menus: this.buildVisibleMenuTree(visibleRows, 0, allowedCodes, isPlatformSuperAdmin),
      butAuths: rows
        .filter((menu: any) => menu.type === 'BUTTON' && canUse(menu))
        .map((menu: any) => menu.code),
    };
  }

  private buildVisibleMenuTree(
    menus: any[],
    parentId: number,
    allowedCodes: Set<string>,
    includeAll: boolean,
  ): any[] {
    return menus
      .filter((menu) => menu.type !== 'BUTTON' && Number(menu.parentId || 0) === parentId)
      .map((menu) => {
        const children = this.buildVisibleMenuTree(
          menus,
          Number(menu.id),
          allowedCodes,
          includeAll,
        );
        const isAllowed = includeAll || allowedCodes.has(menu.code);
        if (!includeAll && menu.type === 'DIRECTORY' && children.length === 0) return null;
        if (!isAllowed && children.length === 0) return null;
        return {
          id: menu.id,
          code: menu.code,
          name: menu.name,
          text: menu.name,
          type: menu.type,
          routePath: menu.routePath,
          itemKey: menu.routePath,
          componentPath: menu.componentPath,
          icon: menu.icon,
          parentId: menu.parentId,
          sortOrder: menu.sortOrder,
          children: children.length > 0 ? children : undefined,
        };
      })
      .filter(Boolean);
  }

  private addAncestorMenuCodes(menus: any[], allowedCodes: Set<string>) {
    const menuById = new Map<number, any>();
    menus.forEach((menu) => menuById.set(Number(menu.id), menu));

    const addParents = (menu: any) => {
      const parent = menuById.get(Number(menu.parentId || 0));
      if (!parent || allowedCodes.has(parent.code)) return;
      allowedCodes.add(parent.code);
      addParents(parent);
    };

    menus.filter((menu) => allowedCodes.has(menu.code)).forEach((menu) => addParents(menu));
  }

  /**
   * 2. 分页查找 (page) - 按创建时间正序
   */
  async findPage(query: QueryUserDto, tenantId: string) {
    const { page = 1, pageSize = 20, username, realName, phone, deptId, isActive } = query;
    const where: any = { tenantId };
    if (username) where.username = Like(`%${username}%`);
    if (realName) where.realName = Like(`%${realName}%`);
    if (phone) where.phone = Like(`%${phone}%`);
    if (deptId) where.deptId = deptId;
    if (isActive !== undefined) where.isActive = isActive;

    const [list, total] = await this.userRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
      relations: ['roles', 'department', 'post'],
    });

    // 新增：为每个用户增加 roleNames 字段
    const listWithRoleNames = list.map((user) => ({
      ...user,
      roleNames: user.roles?.map((r) => r.name) || [],
      roleIds: user.roles?.map((r) => r.id) || [],
      deptName: user.department?.deptName || null,
      postName: user.post?.postName || null,
    }));

    return { list: listWithRoleNames, total, page, pageSize };
  }

  /**
   * 3. 保存新员工 (save)
   */
  async save(dto: CreateUserDto, tenantId: string) {
    if ((dto as any).id) {
      return this.update(dto as UpdateUserDto, tenantId);
    }

    // 检查账号是否重复
    const existing = await this.userRepo.findOne({ where: { username: dto.username, tenantId } });
    if (existing) throw new BusinessException('用户名已存在');

    await this.validateOrg(dto.deptId, dto.postId, tenantId);
    const roles = await this.resolveRoles(dto.roleIds, tenantId);

    // 核心优化：保存前必须加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      ...dto,
      password: hashedPassword,
      tenantId,
    });

    user.roles = roles;

    return await this.userRepo.save(user);
  }

  /**
   * 4. 更新员工信息 (update)
   */
  async update(dto: UpdateUserDto, tenantId: string) {
    const user = await this.userRepo.findOne({
      where: { id: dto.id, tenantId },
      relations: ['roles'],
    });

    if (!user) throw new BusinessException('未找到该员工');

    await this.validateOrg(dto.deptId, dto.postId, tenantId);

    // 如果涉及角色变更，重新映射多对多关系
    if (dto.roleIds) user.roles = await this.resolveRoles(dto.roleIds, tenantId);

    // 合并其他字段 (排除密码，密码有专门的重置接口)
    const { password: _password, roleIds: _roleIds, ...updateInfo } = dto;
    void _password;
    void _roleIds;
    Object.assign(user, updateInfo);

    return await this.userRepo.save(user);
  }

  /**
   * 5. 账号状态一键切换 (status)
   */
  async status(dto: UpdateUserStatusDto, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { id: dto.id, tenantId } });
    if (!user) throw new BusinessException('员工不存在');

    user.isActive = dto.isActive;
    await this.userRepo.save(user);
    return { message: user.isActive === 1 ? '账号已启用' : '账号已禁用' };
  }

  /**
   * 6. 修改个人密码 (password)
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) throw new BusinessException('旧密码错误');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    return await this.userRepo.save(user);
  }

  /**
   * 7. 管理员重置他人密码 (reset)
   */
  async reset(dto: ResetPasswordDto, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId, tenantId } });
    if (!user) throw new BusinessException('员工不存在');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);
    return { message: '密码重置成功' };
  }

  /**
   * 8. 删除员工 (delete)
   */
  async delete(id: string, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new BusinessException('未找到该员工');

    // TypeORM 会自动清理关联表中的 user_roles 记录
    await this.userRepo.remove(user);
    return { message: '删除成功' };
  }
  /**
   * 获取指定员工详情（getDetail）
   */
  async getDetail(id: string, tenantId: string) {
    const user = await this.userRepo.findOne({
      where: { id, tenantId },
      relations: ['roles', 'roles.menus', 'tenant', 'department', 'post'],
    });
    if (!user) throw new NotFoundException('该员工不存在');

    const roleIds = user.roles?.map((r) => r.id) || [];
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      realName: user.realName,
      phone: user.phone,
      email: user.email,
      userType: user.isPlatformAdmin === 1 ? 'platform' : 'tenant',
      tenantId: user.tenantId,
      tenantName: user.tenant?.name || '系统运营',
      deptId: user.deptId,
      deptName: user.department?.deptName || null,
      postId: user.postId,
      postName: user.post?.postName || null,
      isActive: user.isActive,
      roleIds,
    };
  }

  private async resolveRoles(roleIds: string[] = [], tenantId: string) {
    if (!roleIds.length) return [];

    const roles = await this.roleRepo.find({
      where: {
        id: In(roleIds),
        tenantId,
        scope: 'tenant',
        isActive: 1,
      },
    });

    if (roles.length !== roleIds.length) {
      throw new BusinessException('存在不可分配或已停用的角色');
    }

    return roles;
  }

  private async validateOrg(
    deptId: string | undefined,
    postId: string | undefined,
    tenantId: string,
  ) {
    if (deptId) {
      const department = await this.departmentRepo.findOne({ where: { id: deptId, tenantId } });
      if (!department) throw new BusinessException('部门不存在或无权使用');
    }

    if (postId) {
      const post = await this.postRepo.findOne({ where: { id: postId, tenantId } });
      if (!post) throw new BusinessException('岗位不存在或无权使用');
    }
  }
}
