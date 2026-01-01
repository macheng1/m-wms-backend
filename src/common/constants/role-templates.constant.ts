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
  WH_MANAGER: {
    name: '仓库主管',
    code: 'WH_MANAGER',
    description: '负责仓库管理',
    permissionCodes: ['wms:warehouse', 'wms:warehouse:list', 'wms:warehouse:area'],
  },
  // 生产组长：仅库存模块
  PROD_LEADER: {
    name: '生产组长',
    code: 'PROD_LEADER',
    description: '负责库存管理',
    permissionCodes: [
      'wms:inventory',
      'wms:inventory:list',
      'wms:inventory:inbound',
      'wms:inventory:outbound',
    ],
  },
} as const;
