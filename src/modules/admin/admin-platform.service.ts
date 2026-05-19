import { BusinessException } from '@/common/filters/business.exception';
import { Permission } from '@/modules/auth/entities/permission.entity';
import { Role } from '@/modules/roles/entities/role.entity';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';
import { User } from '@/modules/users/entities/user.entity';
import { OperationLog } from './entities/operation-log.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, In, IsNull, Like, Repository } from 'typeorm';

@Injectable()
export class AdminPlatformService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(OperationLog)
    private readonly operationLogRepo: Repository<OperationLog>,
    private readonly dataSource: DataSource,
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

    return this.operationLogRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    }).then(([list, total]) => ({ list, total, page, pageSize }));
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

  findPermissions() {
    return this.permissionRepo.find({
      where: { scope: 'platform' },
      order: { id: 'ASC' },
    });
  }

  findMenus() {
    return this.permissionRepo.find({
      where: { scope: 'platform', type: 'MENU' },
      order: { id: 'ASC' },
    });
  }

  findTenantMenus() {
    return this.permissionRepo.find({
      where: { scope: 'tenant', type: 'MENU' },
      order: { id: 'ASC' },
    });
  }

  async findTenantMenuGrant(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new BusinessException('租户不存在');
    }

    const menus = await this.findTenantMenus();
    const rows: Array<{ code: string }> = await this.dataSource.query(
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

    return {
      tenantId,
      tenantName: tenant.name,
      menus,
      selectedCodes: rows.map((row) => row.code),
    };
  }

  async saveTenantMenuGrant(tenantId: string, permissionCodes: string[]) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new BusinessException('租户不存在');
    }

    const uniqueCodes = [...new Set(permissionCodes)];
    const permissions =
      uniqueCodes.length === 0
        ? []
        : await this.permissionRepo.find({
            where: {
              code: In(uniqueCodes),
              scope: 'tenant',
              type: 'MENU',
            },
          });

    if (permissions.length !== uniqueCodes.length) {
      const existingCodes = new Set(permissions.map((permission) => permission.code));
      const invalidCodes = uniqueCodes.filter((code) => !existingCodes.has(code));
      throw new BusinessException(`存在不可授权的租户菜单：${invalidCodes.join(', ')}`);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM tenant_menu_permissions WHERE tenantId = ?', [tenantId]);
      for (const permission of permissions) {
        await manager.query(
          'INSERT IGNORE INTO tenant_menu_permissions (tenantId, permissionsId) VALUES (?, ?)',
          [tenantId, permission.id],
        );
      }
    });

    return this.findTenantMenuGrant(tenantId);
  }

  async findRoles() {
    return this.roleRepo.find({
      where: { scope: 'platform', tenantId: IsNull() },
      relations: ['permissions'],
      order: { createdAt: 'ASC' },
    });
  }

  async saveRole(dto: {
    id?: string;
    name: string;
    code?: string;
    remark?: string;
    isActive?: number;
    permissionCodes?: string[];
  }) {
    const permissions = await this.getPlatformPermissions(dto.permissionCodes || []);
    const role = dto.id
      ? await this.roleRepo.findOne({
          where: { id: dto.id, scope: 'platform', tenantId: IsNull() },
          relations: ['permissions'],
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
    role.code = dto.code || role.code;
    role.remark = dto.remark || null;
    role.isActive = dto.isActive ?? 1;
    role.scope = 'platform';
    role.tenantId = null;
    role.permissions = permissions;

    return this.roleRepo.save(role);
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
      relations: ['roles'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
    });

    return {
      list: list.map((user) => ({
        ...user,
        roleNames: user.roles?.map((role) => role.name) || [],
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
      relations: ['roles'],
    });

    if (!user) {
      throw new BusinessException('平台用户不存在');
    }

    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      avatar: user.avatar,
      isActive: user.isActive,
      roleIds: user.roles?.map((role) => role.id) || [],
    };
  }

  async saveUser(dto: {
    id?: string;
    username: string;
    password?: string;
    realName?: string;
    avatar?: string;
    isActive?: number;
    roleIds?: string[];
  }) {
    const roles = await this.getPlatformRoles(dto.roleIds || []);
    const user = dto.id
      ? await this.userRepo.findOne({
          where: {
            id: dto.id,
            tenantId: IsNull(),
            isPlatformAdmin: 1,
          },
          relations: ['roles'],
          select: ['id', 'username', 'password', 'realName', 'avatar', 'isActive', 'isPlatformAdmin', 'tenantId'],
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
    user.avatar = dto.avatar || null;
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

  async saveMenu(dto: {
    id?: number;
    code: string;
    name: string;
    routePath?: string | null;
    description?: string | null;
    parentId?: number;
    icon?: string | null;
    sortOrder?: number;
    isHidden?: number;
  }) {
    const existing = await this.permissionRepo.findOne({ where: { code: dto.code } });
    if (existing && existing.id !== dto.id) {
      throw new BusinessException('权限码已存在');
    }

    const menu = dto.id
      ? await this.permissionRepo.findOne({ where: { id: dto.id, scope: 'platform' } })
      : this.permissionRepo.create({
          scope: 'platform',
          type: 'MENU',
        });

    if (!menu) {
      throw new BusinessException('平台菜单不存在');
    }

    menu.code = dto.code;
    menu.name = dto.name;
    menu.routePath = dto.routePath || null;
    menu.description = dto.description || null;
    menu.parentId = dto.parentId ?? 0;
    menu.icon = dto.icon || null;
    menu.sortOrder = dto.sortOrder ?? 0;
    menu.isHidden = dto.isHidden ?? 0;
    menu.scope = 'platform';
    menu.type = 'MENU';

    return this.permissionRepo.save(menu);
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

    return this.tenantRepo.save(tenant);
  }

  async deleteMenu(id: number) {
    const menu = await this.permissionRepo.findOne({ where: { id, scope: 'platform', type: 'MENU' } });
    if (!menu) {
      throw new BusinessException('平台菜单不存在');
    }

    await this.permissionRepo.remove(menu);
    return { id };
  }

  private async getPlatformPermissions(permissionCodes: string[]) {
    if (permissionCodes.length === 0) {
      return [];
    }

    const permissions = await this.permissionRepo.find({
      where: {
        code: In(permissionCodes),
        scope: 'platform',
      },
    });

    if (permissions.length !== permissionCodes.length) {
      const existingCodes = new Set(permissions.map((permission) => permission.code));
      const invalidCodes = permissionCodes.filter((code) => !existingCodes.has(code));
      throw new BusinessException(`存在不可分配的平台权限：${invalidCodes.join(', ')}`);
    }

    return permissions;
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
}
