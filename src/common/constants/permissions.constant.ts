/**
 * 权限元数据接口定义
 */
export interface PermissionMeta {
  code: string; // 权限唯一标识，对应后端 Guard 校验
  name: string; // 权限名称，用于 UI 显示
  description?: string; // 权限详细描述
  isMenu?: boolean; // 是否属于菜单级权限（用于飞冰侧边栏过滤）
}

export interface PermissionGroup {
  module: string; // 模块名称
  actions: PermissionMeta[];
  children?: PermissionGroup[]; // 支持嵌套（可选）
}

/**
 * 全局权限配置
 * 使用 as const 保证类型推导为具体值而非 string
 */
export const PERMISSION_CONFIG = {
  DASHBOARD: {
    module: '工作台',
    actions: [{ code: 'wms:dashboard', name: '工作台', isMenu: true }],
  },
  WAREHOUSE: {
    module: '仓库管理',
    actions: [
      { code: 'wms:warehouse', name: '仓库管理', isMenu: true },
      { code: 'wms:warehouse:list', name: '仓库列表', isMenu: true },
      { code: 'wms:warehouse:area', name: '库区管理', isMenu: true },
    ],
  },
  INVENTORY: {
    module: '库存管理',
    actions: [
      { code: 'wms:inventory', name: '库存管理', isMenu: true },
      { code: 'wms:inventory:list', name: '库存查询', isMenu: true },
      { code: 'wms:inventory:inbound', name: '入库管理', isMenu: true },
      { code: 'wms:inventory:outbound', name: '出库管理', isMenu: true },
    ],
  },
  USERS: {
    module: '员工管理',
    actions: [{ code: 'wms:users', name: '员工管理', isMenu: true }],
  },
  CATEGORY: {
    module: '类目管理',
    actions: [
      { code: 'wms:category', name: '类目管理', isMenu: true },
      { code: 'wms:category:list', name: '类目列表', isMenu: true },
      { code: 'wms:category:add', name: '新增类目' },
      { code: 'wms:category:edit', name: '编辑类目' },
      { code: 'wms:category:delete', name: '删除类目' },
    ],
  },
  SETTINGS: {
    module: '系统设置',
    actions: [
      { code: 'wms:settings', name: '系统设置', isMenu: true },
      { code: 'wms:settings:roles', name: '角色管理', isMenu: true },
      { code: 'wms:settings:permissions', name: '权限管理', isMenu: true },
    ],
  },
} as const;

/**
 * 辅助工具：提取所有权限 Code 的联合类型 (前端校验用)
 */
export type PermissionCode =
  (typeof PERMISSION_CONFIG)[keyof typeof PERMISSION_CONFIG]['actions'][number]['code'];

/**
 * 辅助工具：转换为后端初始化所需的扁平数组
 */
export const flattenPermissions = () => {
  return Object.values(PERMISSION_CONFIG).flatMap((group) =>
    group.actions.map((action) => ({
      ...action,
      module: group.module,
    })),
  );
};
