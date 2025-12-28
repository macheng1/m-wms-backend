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
  // --- 仓库管理模块 ---
  WAREHOUSE: {
    module: '仓库管理',
    actions: [
      { code: 'wh:menu', name: '仓库模块入口', isMenu: true },
      { code: 'wh:inbound', name: '扫码入库', description: '操作常规品或非标品入库' },
      { code: 'wh:outbound', name: '扫码出库', description: '处理自提核销或物流发货' },
      { code: 'wh:transfer', name: '库存移库', description: '库位间货物调拨' },
      { code: 'wh:audit', name: '库存盘点', description: '校对账面与实物库存' },
    ],
  },

  // --- 生产与订单模块 ---
  PRODUCTION: {
    module: '生产排单',
    actions: [
      { code: 'prod:menu', name: '生产模块入口', isMenu: true },
      { code: 'prod:order:create', name: '非标排单录入', description: '手动录入非标定制参数' },
      { code: 'prod:progress:view', name: '进度监控', description: '查看生产线实时状态' },
    ],
  },

  // --- 系统设置模块 ---
  SYSTEM: {
    module: '系统设置',
    actions: [
      { code: 'sys:menu', name: '系统设置入口', isMenu: true },
      { code: 'sys:tenant:config', name: '行业属性配置', description: '定义非标动态参数模板' },
      { code: 'sys:user:manage', name: '员工管理', description: '新增员工及分配角色' },
      { code: 'sys:role:manage', name: '角色权限', description: '自定义工厂内部角色权限' },
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
