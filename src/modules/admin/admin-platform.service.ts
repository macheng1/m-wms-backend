import { BusinessException } from '@/common/filters/business.exception';
import { Menu } from '@/modules/auth/entities/menu.entity';
import { Role } from '@/modules/roles/entities/role.entity';
import { Department } from '@/modules/system/entities/department.entity';
import { Post } from '@/modules/system/entities/post.entity';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { User } from '@/modules/users/entities/user.entity';
import { OperationLog } from './entities/operation-log.entity';
import { MailService } from '../mail/mail.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, In, IsNull, Like, Repository } from 'typeorm';

type PlatformMenuQuery = {
  page?: number;
  pageSize?: number;
  type?: 'DIRECTORY' | 'MENU' | 'BUTTON' | 'all';
  name?: string;
  code?: string;
  routePath?: string;
  isHidden?: number;
};

type PlatformMenuType = 'DIRECTORY' | 'MENU' | 'BUTTON';

@Injectable()
export class AdminPlatformService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepo: Repository<Menu>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(OperationLog)
    private readonly operationLogRepo: Repository<OperationLog>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  async platformDashboard() {
    const [tenantTotal, pendingTenants, activeTenants, platformUsers, platformRoles] =
      await Promise.all([
        this.tenantRepo.count(),
        this.tenantRepo.count({ where: { lifecycleStatus: 'pending' } }),
        this.tenantRepo.count({ where: { lifecycleStatus: 'active' } }),
        this.userRepo.count({ where: { tenantId: IsNull(), isPlatformAdmin: 1 } }),
        this.roleRepo.count({ where: { tenantId: IsNull(), scope: 'platform' } }),
      ]);

    return { tenantTotal, pendingTenants, activeTenants, platformUsers, platformRoles };
  }

  async tenantDashboard(tenantId: string) {
    const [[userRow], [roleRow], [menuRow], [logRow]] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*) AS total FROM users WHERE tenantId = ?', [tenantId]),
      this.dataSource.query('SELECT COUNT(*) AS total FROM roles WHERE tenantId = ?', [tenantId]),
      this.dataSource.query(
        'SELECT COUNT(*) AS total FROM tenant_menu_permissions WHERE tenantId = ?',
        [tenantId],
      ),
      this.dataSource.query('SELECT COUNT(*) AS total FROM operation_logs WHERE tenantId = ?', [
        tenantId,
      ]),
    ]);

    return {
      users: Number(userRow?.total || 0),
      roles: Number(roleRow?.total || 0),
      menus: Number(menuRow?.total || 0),
      operationLogs: Number(logRow?.total || 0),
    };
  }

  findAuditLogs(query: {
    page?: number;
    pageSize?: number;
    scope?: 'platform' | 'tenant';
    tenantId?: string;
    module?: string;
    username?: string;
  }) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const where: any = {};
    if (query.scope) where.scope = query.scope;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.module) where.module = query.module;
    if (query.username) where.username = Like(`%${query.username}%`);

    return this.operationLogRepo
      .findAndCount({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: { createdAt: 'DESC' },
      })
      .then(([list, total]) => ({ list, total, page, pageSize }));
  }

  async recordAudit(input: {
    user?: any;
    scope: 'platform' | 'tenant';
    module: string;
    action: string;
    targetType?: string;
    targetId?: string;
    description?: string;
    beforeData?: Record<string, any> | null;
    afterData?: Record<string, any> | null;
    ip?: string | null;
  }) {
    const log = this.operationLogRepo.create({
      tenantId: input.scope === 'tenant' ? input.user?.tenantId || null : null,
      userId: input.user?.userId || input.user?.sub || null,
      username: input.user?.username || null,
      scope: input.scope,
      module: input.module,
      action: input.action,
      targetType: input.targetType || null,
      targetId: input.targetId || null,
      description: input.description || null,
      beforeData: input.beforeData || null,
      afterData: input.afterData || null,
      ip: input.ip || null,
    });
    return this.operationLogRepo.save(log);
  }

  findAllMenus() {
    return this.menuRepo.find({
      where: { scope: 'platform' },
      order: { id: 'ASC' },
    });
  }

  findMenus() {
    return this.menuRepo.find({
      where: { scope: 'platform', type: In(['DIRECTORY', 'MENU', 'BUTTON']) },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async findMenusPage(query: PlatformMenuQuery) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const where: any = {
      scope: 'platform',
      type: In(['DIRECTORY', 'MENU', 'BUTTON']),
    };

    if (query.type === 'DIRECTORY' || query.type === 'MENU' || query.type === 'BUTTON') {
      where.type = query.type;
    }
    if (query.name) where.name = Like(`%${query.name}%`);
    if (query.code) where.code = Like(`%${query.code}%`);
    if (query.routePath) where.routePath = Like(`%${query.routePath}%`);
    const isHidden = Number(query.isHidden);
    if (isHidden === 0 || isHidden === 1) where.isHidden = isHidden;

    const [list, total] = await this.menuRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return { list, total, page, pageSize };
  }

  async findMenuDetail(id: number) {
    const menu = await this.menuRepo.findOne({
      where: { id, scope: 'platform', type: In(['DIRECTORY', 'MENU', 'BUTTON']) },
    });

    if (!menu) {
      throw new BusinessException('平台菜单不存在');
    }

    return menu;
  }

  async findMenuTree() {
    const menus = await this.findMenus();
    return this.buildMenuTree(menus);
  }

  findTenantMenus() {
    return this.menuRepo
      .find({
        where: { scope: 'tenant', type: In(['DIRECTORY', 'MENU', 'BUTTON']) },
        order: { sortOrder: 'ASC', id: 'ASC' },
      })
      .then((menus) => this.buildMenuTree(menus));
  }

  async findTenantMenuGrant(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new BusinessException('租户不存在');
    }

    const menus = await this.findTenantMenus();
    const rows: Array<{ code: string }> = await this.dataSource.query(
      `
        SELECT m.code
        FROM tenant_menu_permissions tmp
        INNER JOIN menus m ON m.id = tmp.menuId
        WHERE tmp.tenantId = ?
          AND m.scope = 'tenant'
          AND m.type IN ('DIRECTORY', 'MENU', 'BUTTON')
      `,
      [tenantId],
    );

    return {
      tenantId,
      tenantName: tenant.name,
      menus,
      selectedCodes: rows.map((row) => row.code),
    };
  }

  async findCurrentTenantMenuGrant(tenantId: string) {
    const grant = await this.findTenantMenuGrant(tenantId);
    const selectedCodeSet = new Set(grant.selectedCodes);

    return {
      ...grant,
      menus: this.filterGrantedMenuTree(grant.menus, selectedCodeSet),
    };
  }

  async saveTenantMenuGrant(tenantId: string, menuCodes: string[]) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new BusinessException('租户不存在');
    }

    // 平台租户菜单授权按前端提交的勾选项保存，不在保存阶段补父级或展开子级。
    const uniqueCodes = [...new Set(menuCodes)];
    const menus =
      uniqueCodes.length === 0
        ? []
        : await this.menuRepo.find({
            where: {
              code: In(uniqueCodes),
              scope: 'tenant',
              type: In(['DIRECTORY', 'MENU', 'BUTTON']),
            },
          });

    if (menus.length !== uniqueCodes.length) {
      const existingCodes = new Set(menus.map((menu) => menu.code));
      const invalidCodes = uniqueCodes.filter((code) => !existingCodes.has(code));
      throw new BusinessException(`存在不可授权的租户菜单：${invalidCodes.join(', ')}`);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM tenant_menu_permissions WHERE tenantId = ?', [tenantId]);
      for (const menu of menus) {
        await manager.query(
          'INSERT IGNORE INTO tenant_menu_permissions (tenantId, menuId) VALUES (?, ?)',
          [tenantId, menu.id],
        );
      }
    });

    return this.findTenantMenuGrant(tenantId);
  }

  async findRoles() {
    return this.roleRepo
      .find({
        where: { scope: 'platform', tenantId: IsNull() },
        relations: ['menus', 'departments'],
        order: { createdAt: 'ASC' },
      })
      .then((roles) =>
        roles.map((role) => ({
          ...role,
          menuCodes: role.menus?.map((menu) => menu.code) || [],
          menuIds: role.menus?.map((menu) => menu.id) || [],
          deptIds: role.departments?.map((department) => department.id) || [],
        })),
      );
  }

  async saveRole(dto: {
    id?: string;
    name: string;
    code?: string;
    remark?: string;
    isActive?: number;
    menuCodes?: string[];
    menuIds?: number[];
    dataScope?: 'ALL' | 'CUSTOM' | 'DEPT' | 'DEPT_AND_CHILD' | 'SELF';
    deptIds?: string[];
  }) {
    const menus = await this.getPlatformMenus(dto.menuCodes || [], dto.menuIds || []);
    const departments = await this.getPlatformDepartments(dto.deptIds || []);
    const role = dto.id
      ? await this.roleRepo.findOne({
          where: { id: dto.id, scope: 'platform', tenantId: IsNull() },
          relations: ['menus', 'departments'],
        })
      : this.roleRepo.create({
          tenantId: null,
          scope: 'platform',
          isSystem: false,
        });

    if (!role) {
      throw new BusinessException('平台角色不存在');
    }

    role.name = dto.name;
    role.code = dto.id
      ? role.code || (await this.generatePlatformRoleCode())
      : await this.generatePlatformRoleCode();
    role.remark = dto.remark || null;
    role.isActive = dto.isActive ?? 1;
    role.scope = 'platform';
    role.tenantId = null;
    role.dataScope = dto.dataScope || role.dataScope || 'ALL';
    role.menus = menus;
    role.departments = departments;

    return this.roleRepo.save(role);
  }

  async deleteRole(id: string) {
    const role = await this.roleRepo.findOne({
      where: { id, scope: 'platform', tenantId: IsNull() },
    });
    if (!role) {
      throw new BusinessException('平台角色不存在');
    }
    if (role.isSystem) {
      throw new BusinessException('系统角色不允许删除');
    }

    const [userRow]: Array<{ total: string | number }> = await this.dataSource.query(
      'SELECT COUNT(*) AS total FROM user_roles WHERE rolesId = ?',
      [id],
    );
    if (Number(userRow?.total || 0) > 0) {
      throw new BusinessException('该角色已分配给平台用户，请先解除用户角色后再删除');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM role_menus WHERE roleId = ?', [id]);
      await manager.query('DELETE FROM role_departments WHERE roleId = ?', [id]);
      await manager.remove(role);
    });

    return { id: role.id, name: role.name, code: role.code };
  }

  async findUsers(query: {
    page?: number;
    pageSize?: number;
    username?: string;
    isActive?: number;
  }) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const where: any = {
      tenantId: IsNull(),
      isPlatformAdmin: 1,
    };

    if (query.username) {
      where.username = Like(`%${query.username}%`);
    }
    const isActive = Number(query.isActive);
    if (isActive === 0 || isActive === 1) {
      where.isActive = isActive;
    }

    const [list, total] = await this.userRepo.findAndCount({
      where,
      relations: ['roles', 'department', 'post'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
    });

    return {
      list: list.map((user) => ({
        ...user,
        roleNames: user.roles?.map((role) => role.name) || [],
        roleIds: user.roles?.map((role) => role.id) || [],
        deptName: user.department?.deptName || null,
        postName: user.post?.postName || null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async findUserDetail(id: string) {
    const user = await this.userRepo.findOne({
      where: {
        id,
        tenantId: IsNull(),
        isPlatformAdmin: 1,
      },
      relations: ['roles', 'department', 'post'],
    });

    if (!user) {
      throw new BusinessException('平台用户不存在');
    }

    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      avatar: user.avatar,
      phone: user.phone,
      email: user.email,
      deptId: user.deptId,
      deptName: user.department?.deptName || null,
      postId: user.postId,
      postName: user.post?.postName || null,
      isActive: user.isActive,
      roleIds: user.roles?.map((role) => role.id) || [],
    };
  }

  async saveUser(dto: {
    id?: string;
    username: string;
    password?: string;
    realName?: string;
    phone?: string;
    email?: string;
    avatar?: string;
    deptId?: string | null;
    postId?: string | null;
    isActive?: number;
    roleIds?: string[];
  }) {
    const roles = await this.getPlatformRoles(dto.roleIds || []);
    await this.validatePlatformOrg(dto.deptId, dto.postId);
    const user = dto.id
      ? await this.userRepo.findOne({
          where: {
            id: dto.id,
            tenantId: IsNull(),
            isPlatformAdmin: 1,
          },
          relations: ['roles'],
          select: [
            'id',
            'username',
            'password',
            'realName',
            'phone',
            'email',
            'avatar',
            'deptId',
            'postId',
            'isActive',
            'isPlatformAdmin',
            'tenantId',
          ],
        })
      : this.userRepo.create({
          tenantId: null,
          isPlatformAdmin: 1,
        });

    if (!user) {
      throw new BusinessException('平台用户不存在');
    }

    const existing = await this.userRepo.findOne({
      where: {
        username: dto.username,
        tenantId: IsNull(),
        isPlatformAdmin: 1,
      },
    });
    if (existing && existing.id !== dto.id) {
      throw new BusinessException('平台用户名已存在');
    }

    if (!dto.id && !dto.password) {
      throw new BusinessException('新建平台用户必须设置密码');
    }

    user.username = dto.username;
    user.realName = dto.realName || null;
    user.phone = dto.phone || null;
    user.email = dto.email || null;
    user.avatar = dto.avatar || null;
    user.deptId = dto.deptId || null;
    user.postId = dto.postId || null;
    user.isActive = dto.isActive ?? 1;
    user.isPlatformAdmin = 1;
    user.tenantId = null;
    user.roles = roles;

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    return this.userRepo.save(user);
  }

  async updateUserStatus(id: string, isActive: number) {
    const user = await this.userRepo.findOne({
      where: {
        id,
        tenantId: IsNull(),
        isPlatformAdmin: 1,
      },
    });

    if (!user) {
      throw new BusinessException('平台用户不存在');
    }

    user.isActive = isActive;
    await this.userRepo.save(user);
    return { id, isActive };
  }

  async deleteUser(id: string, currentUserId?: string) {
    if (currentUserId && String(currentUserId) === String(id)) {
      throw new BusinessException('不能删除当前登录账号');
    }

    const user = await this.userRepo.findOne({
      where: {
        id,
        tenantId: IsNull(),
        isPlatformAdmin: 1,
      },
    });
    if (!user) {
      throw new BusinessException('平台用户不存在');
    }

    const platformUserCount = await this.userRepo.count({
      where: {
        tenantId: IsNull(),
        isPlatformAdmin: 1,
      },
    });
    if (platformUserCount <= 1) {
      throw new BusinessException('至少保留一个平台用户');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM user_roles WHERE usersId = ?', [id]);
      await manager.remove(user);
    });

    return { id: user.id, username: user.username };
  }

  async saveMenu(dto: {
    id?: number;
    type?: PlatformMenuType;
    code: string;
    name: string;
    routePath?: string | null;
    componentPath?: string | null;
    description?: string | null;
    parentId?: number;
    icon?: string | null;
    sortOrder?: number;
    isHidden?: number;
    isActive?: number;
  }) {
    const type = dto.type || 'MENU';
    const existing = await this.menuRepo.findOne({ where: { code: dto.code } });
    if (existing && existing.id !== dto.id) {
      throw new BusinessException('菜单码已存在');
    }

    const menu = dto.id
      ? await this.menuRepo.findOne({
          where: { id: dto.id, scope: 'platform', type: In(['DIRECTORY', 'MENU', 'BUTTON']) },
        })
      : this.menuRepo.create({
          scope: 'platform',
          type,
        });

    if (!menu) {
      throw new BusinessException('平台菜单不存在');
    }

    if (dto.parentId && dto.parentId === dto.id) {
      throw new BusinessException('上级菜单不能选择自己');
    }

    if (dto.parentId && dto.parentId > 0) {
      const parentMenu = await this.menuRepo.findOne({
        where: { id: dto.parentId, scope: 'platform', type: In(['DIRECTORY', 'MENU']) },
      });
      if (!parentMenu) {
        throw new BusinessException('上级菜单不存在');
      }
    }

    menu.code = dto.code;
    menu.name = dto.name;
    menu.routePath = type === 'BUTTON' ? null : dto.routePath || null;
    menu.componentPath = type === 'MENU' ? dto.componentPath || null : null;
    menu.description = dto.description || null;
    menu.parentId = dto.parentId ?? 0;
    menu.icon = type === 'BUTTON' ? null : dto.icon || null;
    menu.sortOrder = dto.sortOrder ?? 0;
    menu.isHidden = dto.isHidden ?? 0;
    menu.isActive = dto.isActive ?? 1;
    menu.scope = 'platform';
    menu.type = type;

    return this.menuRepo.save(menu);
  }

  async updateTenantLifecycle(
    id: string,
    dto: {
      lifecycleStatus?: 'pending' | 'active' | 'rejected' | 'disabled' | 'expired';
      expiresAt?: string | null;
      auditRemark?: string | null;
      disabledReason?: string | null;
      isActive?: number;
      isApproved?: number;
    },
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new BusinessException('租户不存在');

    if (dto.lifecycleStatus) tenant.lifecycleStatus = dto.lifecycleStatus;
    if ('expiresAt' in dto) tenant.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if ('auditRemark' in dto) tenant.auditRemark = dto.auditRemark || null;
    if ('disabledReason' in dto) tenant.disabledReason = dto.disabledReason || null;
    if (dto.isActive === 0 || dto.isActive === 1) tenant.isActive = dto.isActive;
    if (dto.isApproved === 0 || dto.isApproved === 1) tenant.isApproved = dto.isApproved;

    if (tenant.lifecycleStatus === 'active') {
      tenant.isActive = 1;
      tenant.isApproved = 1;
      tenant.approvedAt = tenant.approvedAt || new Date();
    }
    if (tenant.lifecycleStatus === 'disabled' || tenant.lifecycleStatus === 'rejected') {
      tenant.isActive = 0;
      if (tenant.lifecycleStatus === 'rejected') tenant.isApproved = 0;
    }

    const savedTenant = await this.tenantRepo.save(tenant);
    await this.sendTenantLifecycleEmail(savedTenant);
    return savedTenant;
  }

  private async sendTenantLifecycleEmail(tenant: Tenant) {
    if (!tenant.email) return;

    if (tenant.lifecycleStatus === 'active') {
      await this.mailService.sendMail({
        to: tenant.email,
        subject: `企业入驻审核通过 - ${tenant.name}`,
        text: `您好，${tenant.name} 的入驻申请已审核通过。企业编码：${tenant.code}。请使用注册时设置的管理员账号登录系统。`,
        html: `
          <p>您好，</p>
          <p><strong>${tenant.name}</strong> 的入驻申请已审核通过。</p>
          <p>企业编码：<strong>${tenant.code}</strong></p>
          <p>请使用注册时设置的管理员账号登录系统。</p>
        `,
      });
    }

    if (tenant.lifecycleStatus === 'rejected') {
      await this.mailService.sendMail({
        to: tenant.email,
        subject: `企业入驻审核未通过 - ${tenant.name}`,
        text: `您好，${tenant.name} 的入驻申请未通过审核。${tenant.auditRemark ? `原因：${tenant.auditRemark}` : ''}`,
        html: `
          <p>您好，</p>
          <p><strong>${tenant.name}</strong> 的入驻申请未通过审核。</p>
          ${tenant.auditRemark ? `<p>原因：${tenant.auditRemark}</p>` : ''}
        `,
      });
    }
  }

  async deleteMenu(id: number) {
    const menu = await this.menuRepo.findOne({
      where: { id, scope: 'platform', type: In(['DIRECTORY', 'MENU', 'BUTTON']) },
    });
    if (!menu) {
      throw new BusinessException('平台菜单不存在');
    }

    const childCount = await this.menuRepo.count({
      where: { scope: 'platform', parentId: id },
    });
    if (childCount > 0) {
      throw new BusinessException('请先删除该菜单下的子菜单');
    }

    const [bindingRow]: Array<{ total: string | number }> = await this.dataSource.query(
      'SELECT COUNT(*) AS total FROM role_menus WHERE menuId = ?',
      [id],
    );
    if (Number(bindingRow?.total || 0) > 0) {
      throw new BusinessException('该菜单已绑定平台角色，请先解除角色授权后再删除');
    }

    await this.menuRepo.remove(menu);
    return { id: menu.id, name: menu.name, code: menu.code };
  }

  private buildMenuTree(menus: Menu[], parentId = 0): Array<Menu & { children?: Menu[] }> {
    return menus
      .filter((menu) => Number(menu.parentId || 0) === parentId)
      .map((menu) => {
        const children = this.buildMenuTree(menus, menu.id);
        return children.length > 0 ? { ...menu, children } : menu;
      });
  }

  private filterGrantedMenuTree(
    menus: Array<Menu & { children?: Menu[] }> = [],
    selectedCodes: Set<string>,
  ): Array<Menu & { children?: Menu[] }> {
    return menus
      .map((menu) => {
        const children = this.filterGrantedMenuTree(
          (menu.children || []) as Array<Menu & { children?: Menu[] }>,
          selectedCodes,
        );
        if (!selectedCodes.has(menu.code) && children.length === 0) return null;
        return children.length > 0 ? { ...menu, children } : { ...menu, children: undefined };
      })
      .filter(Boolean) as Array<Menu & { children?: Menu[] }>;
  }

  private async getPlatformMenus(menuCodes: string[], menuIds: number[] = []) {
    if (menuCodes.length === 0 && menuIds.length === 0) {
      return [];
    }

    const menus = await this.menuRepo.find({
      where: {
        scope: 'platform',
        ...(menuIds.length > 0 ? { id: In(menuIds) } : { code: In(menuCodes) }),
      },
    });

    const expectedValues = menuIds.length > 0 ? menuIds : menuCodes;
    if (menus.length !== expectedValues.length) {
      const existingCodes = new Set(menus.map((menu) => menu.code));
      const existingIds = new Set(menus.map((menu) => menu.id));
      const invalidValues =
        menuIds.length > 0
          ? menuIds.filter((id) => !existingIds.has(id))
          : menuCodes.filter((code) => !existingCodes.has(code));
      throw new BusinessException(`存在不可分配的平台菜单：${invalidValues.join(', ')}`);
    }

    return menus;
  }

  private async getPlatformDepartments(deptIds: string[]) {
    if (deptIds.length === 0) {
      return [];
    }

    const departments = await this.departmentRepo.find({
      where: { id: In(deptIds), tenantId: IsNull() },
    });
    if (departments.length !== deptIds.length) {
      throw new BusinessException('存在不可分配的平台部门');
    }

    return departments;
  }

  private async validatePlatformOrg(deptId?: string | null, postId?: string | null) {
    if (deptId) {
      const department = await this.departmentRepo.findOne({
        where: { id: deptId, tenantId: IsNull() },
      });
      if (!department) throw new BusinessException('平台部门不存在或无权使用');
    }

    if (postId) {
      const post = await this.postRepo.findOne({ where: { id: postId, tenantId: IsNull() } });
      if (!post) throw new BusinessException('平台岗位不存在或无权使用');
    }
  }

  private async getPlatformRoles(roleIds: string[]) {
    if (roleIds.length === 0) {
      return [];
    }

    const roles = await this.roleRepo.find({
      where: {
        id: In(roleIds),
        scope: 'platform',
        tenantId: IsNull(),
      },
    });

    if (roles.length !== roleIds.length) {
      throw new BusinessException('存在不可分配的平台角色');
    }

    return roles;
  }

  private async generatePlatformRoleCode() {
    for (let i = 0; i < 5; i += 1) {
      const random = Math.random().toString(36).slice(2, 8).toUpperCase();
      const code = `PR${random}`;
      const exists = await this.roleRepo.findOne({
        where: { code, scope: 'platform', tenantId: IsNull() },
      });
      if (!exists) return code;
    }

    throw new BusinessException('生成平台角色编码失败，请重试');
  }
}
