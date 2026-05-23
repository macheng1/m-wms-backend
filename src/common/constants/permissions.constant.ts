/**
 * 权限域：
 * - platform：平台超级管理员使用，负责租户、平台菜单、平台角色、平台用户和平台配置。
 * - tenant：租户管理员和租户员工使用，负责本租户员工、角色、菜单和业务数据。
 */
export type PermissionScope = 'platform' | 'tenant';

export interface PermissionMeta {
  code: string;
  name: string;
  description?: string;
  isMenu?: boolean;
  routePath?: string;
  scope?: PermissionScope;
}

export interface PermissionGroup {
  module: string;
  scope: PermissionScope;
  actions: PermissionMeta[];
}

export const PERMISSION_CONFIG = {
  PLATFORM_DASHBOARD: {
    module: '平台工作台',
    scope: 'platform',
    actions: [{ code: 'platform:dashboard', name: '平台工作台', isMenu: true, routePath: '/' }],
  },
  PLATFORM_TENANT: {
    module: '租户管理',
    scope: 'platform',
    actions: [
      { code: 'platform:tenant', name: '租户管理', isMenu: true, routePath: '/tenants' },
      { code: 'platform:tenant:list', name: '租户列表', isMenu: true, routePath: '/tenants' },
      { code: 'platform:tenant:create', name: '新增租户' },
      { code: 'platform:tenant:update', name: '编辑租户' },
      { code: 'platform:tenant:delete', name: '删除租户' },
      { code: 'platform:tenant:approve', name: '审核租户' },
      { code: 'platform:tenant:status', name: '启用/禁用租户' },
    ],
  },
  PLATFORM_SECURITY: {
    module: '平台权限',
    scope: 'platform',
    actions: [
      { code: 'platform:settings', name: '系统设置', isMenu: true, routePath: '/settings' },
      { code: 'platform:user', name: '平台用户', isMenu: true, routePath: '/settings/platform-users' },
      { code: 'platform:role', name: '平台角色', isMenu: true, routePath: '/settings/platform-roles' },
      { code: 'platform:menu', name: '平台菜单', isMenu: true, routePath: '/settings/platform-menus' },
      {
        code: 'platform:permission',
        name: '平台权限',
        isMenu: true,
        routePath: '/settings/platform-permissions',
      },
      {
        code: 'platform:audit-log',
        name: '平台审计',
        isMenu: true,
        routePath: '/settings/platform-audit-logs',
      },
    ],
  },
  PLATFORM_CONFIG: {
    module: '平台配置',
    scope: 'platform',
    actions: [
      { code: 'platform:config', name: '平台配置', isMenu: true, routePath: '/settings/dict' },
      { code: 'platform:dept', name: '平台部门', isMenu: true, routePath: '/settings/dept' },
      { code: 'platform:post', name: '平台岗位', isMenu: true, routePath: '/settings/post' },
    ],
  },

  TENANT_DASHBOARD: {
    module: '租户工作台',
    scope: 'tenant',
    actions: [{ code: 'tenant:dashboard', name: '工作台', isMenu: true, routePath: '/' }],
  },
  TENANT_BASE: {
    module: '基础资料',
    scope: 'tenant',
    actions: [
      { code: 'tenant:base', name: '基础资料', isMenu: true, routePath: '/base' },
      { code: 'tenant:unit:list', name: '单位管理', isMenu: true, routePath: '/inventory/unit' },
    ],
  },
  TENANT_SECURITY: {
    module: '组织权限',
    scope: 'tenant',
    actions: [
      { code: 'tenant:user:list', name: '员工管理', isMenu: true, routePath: '/users' },
      { code: 'tenant:user:create', name: '新增员工' },
      { code: 'tenant:user:update', name: '编辑员工' },
      { code: 'tenant:user:delete', name: '删除员工' },
      { code: 'tenant:role:list', name: '角色管理', isMenu: true, routePath: '/settings/roles' },
      { code: 'tenant:role:create', name: '新增角色' },
      { code: 'tenant:role:update', name: '编辑角色' },
      { code: 'tenant:role:delete', name: '删除角色' },
      { code: 'tenant:menu:list', name: '租户菜单', isMenu: true, routePath: '/settings/permissions' },
      { code: 'tenant:dict', name: '租户字典', isMenu: true, routePath: '/settings/dict' },
      { code: 'tenant:dept', name: '部门管理', isMenu: true, routePath: '/settings/dept' },
      { code: 'tenant:post', name: '岗位管理', isMenu: true, routePath: '/settings/post' },
      { code: 'tenant:audit-log', name: '操作日志', isMenu: true, routePath: '/settings/operation-logs' },
    ],
  },
  TENANT_PRODUCT: {
    module: '产品管理',
    scope: 'tenant',
    actions: [
      { code: 'tenant:product', name: '产品管理', isMenu: true, routePath: '/product' },
      { code: 'tenant:product:list', name: '产品列表', isMenu: true, routePath: '/product/list' },
      { code: 'tenant:product:create', name: '新增产品' },
      { code: 'tenant:product:update', name: '编辑产品' },
      { code: 'tenant:product:delete', name: '删除产品' },
      { code: 'tenant:product:import', name: '导入产品' },
      { code: 'tenant:category:list', name: '类目管理', isMenu: true, routePath: '/category/list' },
      { code: 'tenant:attribute:list', name: '属性管理', isMenu: true, routePath: '/product/attr' },
      { code: 'tenant:spec:list', name: '规格管理', isMenu: true, routePath: '/product/spec' },
    ],
  },
  TENANT_WAREHOUSE: {
    module: '仓库管理',
    scope: 'tenant',
    actions: [
      { code: 'tenant:warehouse', name: '仓库管理', isMenu: true, routePath: '/warehouse' },
      { code: 'tenant:location:list', name: '库位管理', isMenu: true, routePath: '/warehouse/list' },
      { code: 'tenant:location:create', name: '新增库位' },
      { code: 'tenant:location:update', name: '编辑库位' },
      { code: 'tenant:location:delete', name: '删除库位' },
    ],
  },
  TENANT_INVENTORY: {
    module: '库存管理',
    scope: 'tenant',
    actions: [
      { code: 'tenant:inventory', name: '库存管理', isMenu: true, routePath: '/inventory' },
      { code: 'tenant:inventory:list', name: '库存查询', isMenu: true, routePath: '/inventory/list' },
      { code: 'tenant:inventory:inbound', name: '入库管理', isMenu: true, routePath: '/inventory/inbound' },
      { code: 'tenant:inventory:outbound', name: '出库管理', isMenu: true, routePath: '/inventory/outbound' },
      { code: 'tenant:inventory:adjust', name: '库存调整' },
      {
        code: 'tenant:inventory:transaction:list',
        name: '库存流水',
        isMenu: true,
        routePath: '/inventory/transactions',
      },
      { code: 'tenant:inventory:alert:list', name: '库存预警', isMenu: true, routePath: '/inventory/alerts' },
    ],
  },
  TENANT_ORDER: {
    module: '订单管理',
    scope: 'tenant',
    actions: [
      { code: 'tenant:order', name: '订单管理', isMenu: true },
      { code: 'tenant:order:list', name: '订单列表', isMenu: true },
      { code: 'tenant:order:create', name: '新增订单' },
      { code: 'tenant:order:update', name: '编辑订单' },
      { code: 'tenant:order:delete', name: '删除订单' },
    ],
  },
  TENANT_PORTAL: {
    module: '官网管理',
    scope: 'tenant',
    actions: [
      { code: 'tenant:portal', name: '官网管理', isMenu: true, routePath: '/website' },
      { code: 'tenant:portal:config', name: '官网配置', isMenu: true, routePath: '/base' },
      { code: 'tenant:portal:inquiry:list', name: '询盘管理', isMenu: true, routePath: '/website/inquiry' },
    ],
  },
} as const;

export type PermissionCode =
  (typeof PERMISSION_CONFIG)[keyof typeof PERMISSION_CONFIG]['actions'][number]['code'];

export const flattenPermissions = () => {
  return Object.values(PERMISSION_CONFIG).flatMap((group) =>
    group.actions.map((action) => ({
      ...action,
      module: group.module,
      scope: 'scope' in action ? action.scope : group.scope,
    })),
  );
};

export const flattenTenantPermissions = () =>
  flattenPermissions().filter((permission) => permission.scope === 'tenant');

export const flattenPlatformPermissions = () =>
  flattenPermissions().filter((permission) => permission.scope === 'platform');
