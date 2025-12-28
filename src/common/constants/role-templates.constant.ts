// src/common/constants/role-templates.constant.ts
import { PERMISSION_CONFIG } from './permissions.constant';

export const ROLE_TEMPLATES = {
  // 租户超级管理员：拥有所有模块的所有权限
  SUPER_ADMIN: {
    name: '系统管理员',
    code: 'ADMIN',
    description: '拥有工厂内所有操作权限',
    // 自动提取所有权限 code
    permissionCodes: Object.values(PERMISSION_CONFIG).flatMap((g) => g.actions.map((a) => a.code)),
  },
  // 仓库主管：仅仓库模块
  WH_MANAGER: {
    name: '仓库主管',
    code: 'WH_MANAGER',
    description: '负责出入库、盘点及移库管理',
    permissionCodes: ['wh:menu', 'wh:inbound', 'wh:outbound', 'wh:transfer', 'wh:audit'],
  },
  // 生产组长：仅排单和进度查看
  PROD_LEADER: {
    name: '生产组长',
    code: 'PROD_LEADER',
    description: '负责非标订单录入与生产监控',
    permissionCodes: ['prod:menu', 'prod:order:create', 'prod:progress:view'],
  },
} as const;
