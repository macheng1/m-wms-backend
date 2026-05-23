// src/common/constants/role-templates.constant.ts
import { flattenTenantPermissions } from './permissions.constant';

export const ROLE_TEMPLATES = {
  // 租户超级管理员：拥有所有模块的所有权限
  SUPER_ADMIN: {
    name: '系统管理员',
    code: 'ADMIN',
    description: '拥有工厂内所有操作权限',
    scope: 'tenant',
    // 自动提取所有租户域权限 code。平台域权限不下发给租户角色。
    menuCodes: flattenTenantPermissions().map((permission) => permission.code),
  },
  WH_MANAGER: {
    name: '仓库主管',
    code: 'WH_MANAGER',
    description: '负责仓库管理',
    scope: 'tenant',
    menuCodes: [
      'tenant:warehouse',
      'tenant:location:list',
      'tenant:inventory',
      'tenant:inventory:list',
      'tenant:inventory:inbound',
      'tenant:inventory:outbound',
      'tenant:inventory:transaction:list',
    ],
  },
  // 生产组长：仅库存模块
  PROD_LEADER: {
    name: '生产组长',
    code: 'PROD_LEADER',
    description: '负责库存管理',
    scope: 'tenant',
    menuCodes: [
      'tenant:inventory',
      'tenant:inventory:list',
      'tenant:inventory:inbound',
      'tenant:inventory:outbound',
      'tenant:inventory:adjust',
      'tenant:inventory:transaction:list',
    ],
  },
} as const;
