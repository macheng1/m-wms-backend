-- 用途：初始化平台域/租户域权限数据
-- 来源需求：平台维护菜单和权限定义，租户管理员只分配已开放的租户权限
-- 影响范围：permissions
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB
-- 说明：本文件按权限 code 幂等写入，新模型不再保留 wms:* 兼容权限码。
-- 前置条件：空库需先执行 init/init-schema.sql；旧库需先执行对应 create-table 或 alter-table 下的 update.sql。
-- 常见错误：Unknown column `scope` 表示结构脚本未执行或当前库不是新结构。

DELETE rp
FROM `role_permissions` rp
JOIN `permissions` p ON p.`id` = rp.`permissionsId`
WHERE p.`code` LIKE 'wms:%';

DELETE FROM `permissions`
WHERE `code` LIKE 'wms:%';

INSERT INTO `permissions` (`code`, `scope`, `name`, `type`, `parentId`, `description`)
VALUES
  ('platform:dashboard', 'platform', '平台工作台', 'MENU', 0, '平台工作台'),
  ('platform:tenant', 'platform', '租户管理', 'DIRECTORY', 0, '租户管理'),
  ('platform:tenant:list', 'platform', '租户列表', 'MENU', 0, '租户列表'),
  ('platform:tenant:create', 'platform', '新增租户', 'BUTTON', 0, '新增租户'),
  ('platform:tenant:update', 'platform', '编辑租户', 'BUTTON', 0, '编辑租户'),
  ('platform:tenant:delete', 'platform', '删除租户', 'BUTTON', 0, '删除租户'),
  ('platform:tenant:approve', 'platform', '审核租户', 'BUTTON', 0, '审核租户'),
  ('platform:tenant:status', 'platform', '启用/禁用租户', 'BUTTON', 0, '启用或禁用租户'),
  ('platform:settings', 'platform', '系统设置', 'DIRECTORY', 0, '系统设置'),
  ('platform:user', 'platform', '平台用户', 'MENU', 0, '平台用户'),
  ('platform:role', 'platform', '平台角色', 'MENU', 0, '平台角色'),
  ('platform:menu', 'platform', '平台菜单', 'MENU', 0, '平台菜单'),
  ('platform:audit-log', 'platform', '平台审计', 'MENU', 0, '平台操作审计'),
  ('platform:config', 'platform', '平台配置', 'MENU', 0, '平台配置'),
  ('platform:dept', 'platform', '平台部门', 'MENU', 0, '平台部门'),
  ('platform:post', 'platform', '平台岗位', 'MENU', 0, '平台岗位'),

  ('tenant:dashboard', 'tenant', '工作台', 'MENU', 0, '租户工作台'),
  ('tenant:base', 'tenant', '基础资料', 'MENU', 0, '基础资料'),
  ('tenant:unit:list', 'tenant', '单位管理', 'MENU', 0, '单位管理'),
  ('tenant:user:list', 'tenant', '员工管理', 'MENU', 0, '员工管理'),
  ('tenant:user:create', 'tenant', '新增员工', 'BUTTON', 0, '新增员工'),
  ('tenant:user:update', 'tenant', '编辑员工', 'BUTTON', 0, '编辑员工'),
  ('tenant:user:delete', 'tenant', '删除员工', 'BUTTON', 0, '删除员工'),
  ('tenant:role:list', 'tenant', '角色管理', 'MENU', 0, '角色管理'),
  ('tenant:role:create', 'tenant', '新增角色', 'BUTTON', 0, '新增角色'),
  ('tenant:role:update', 'tenant', '编辑角色', 'BUTTON', 0, '编辑角色'),
  ('tenant:role:delete', 'tenant', '删除角色', 'BUTTON', 0, '删除角色'),
  ('tenant:menu:list', 'tenant', '租户菜单', 'MENU', 0, '租户菜单'),
  ('tenant:dict', 'tenant', '租户字典', 'MENU', 0, '租户字典'),
  ('tenant:dept', 'tenant', '部门管理', 'MENU', 0, '部门管理'),
  ('tenant:post', 'tenant', '岗位管理', 'MENU', 0, '岗位管理'),
  ('tenant:audit-log', 'tenant', '操作日志', 'MENU', 0, '租户操作日志'),
  ('tenant:product', 'tenant', '产品管理', 'DIRECTORY', 0, '产品管理'),
  ('tenant:product:list', 'tenant', '产品列表', 'MENU', 0, '产品列表'),
  ('tenant:product:create', 'tenant', '新增产品', 'BUTTON', 0, '新增产品'),
  ('tenant:product:update', 'tenant', '编辑产品', 'BUTTON', 0, '编辑产品'),
  ('tenant:product:delete', 'tenant', '删除产品', 'BUTTON', 0, '删除产品'),
  ('tenant:product:import', 'tenant', '导入产品', 'BUTTON', 0, '导入产品'),
  ('tenant:category:list', 'tenant', '类目管理', 'MENU', 0, '类目管理'),
  ('tenant:attribute:list', 'tenant', '属性管理', 'MENU', 0, '属性管理'),
  ('tenant:spec:list', 'tenant', '规格管理', 'MENU', 0, '规格管理'),
  ('tenant:warehouse', 'tenant', '仓库管理', 'DIRECTORY', 0, '仓库管理'),
  ('tenant:location:list', 'tenant', '库位管理', 'MENU', 0, '库位管理'),
  ('tenant:location:create', 'tenant', '新增库位', 'BUTTON', 0, '新增库位'),
  ('tenant:location:update', 'tenant', '编辑库位', 'BUTTON', 0, '编辑库位'),
  ('tenant:location:delete', 'tenant', '删除库位', 'BUTTON', 0, '删除库位'),
  ('tenant:inventory', 'tenant', '库存管理', 'DIRECTORY', 0, '库存管理'),
  ('tenant:inventory:list', 'tenant', '库存查询', 'MENU', 0, '库存查询'),
  ('tenant:inventory:inbound', 'tenant', '入库管理', 'MENU', 0, '入库管理'),
  ('tenant:inventory:outbound', 'tenant', '出库管理', 'MENU', 0, '出库管理'),
  ('tenant:inventory:adjust', 'tenant', '库存调整', 'BUTTON', 0, '库存调整'),
  ('tenant:inventory:transaction:list', 'tenant', '库存流水', 'MENU', 0, '库存流水'),
  ('tenant:inventory:alert:list', 'tenant', '库存预警', 'MENU', 0, '库存预警'),
  ('tenant:order', 'tenant', '订单管理', 'DIRECTORY', 0, '订单管理'),
  ('tenant:order:list', 'tenant', '订单列表', 'MENU', 0, '订单列表'),
  ('tenant:order:create', 'tenant', '新增订单', 'BUTTON', 0, '新增订单'),
  ('tenant:order:update', 'tenant', '编辑订单', 'BUTTON', 0, '编辑订单'),
  ('tenant:order:delete', 'tenant', '删除订单', 'BUTTON', 0, '删除订单'),
  ('tenant:portal', 'tenant', '官网管理', 'DIRECTORY', 0, '官网管理'),
  ('tenant:portal:config', 'tenant', '官网配置', 'MENU', 0, '官网配置'),
  ('tenant:portal:inquiry:list', 'tenant', '询盘管理', 'MENU', 0, '询盘管理')
ON DUPLICATE KEY UPDATE
  `scope` = VALUES(`scope`),
  `name` = VALUES(`name`),
  `type` = VALUES(`type`),
  `parentId` = VALUES(`parentId`),
  `description` = VALUES(`description`);

UPDATE `permissions`
SET `routePath` = CASE `code`
  WHEN 'platform:dashboard' THEN '/'
  WHEN 'platform:tenant' THEN '/tenants'
  WHEN 'platform:tenant:list' THEN '/tenants'
  WHEN 'platform:settings' THEN '/settings'
  WHEN 'platform:user' THEN '/settings/platform-users'
  WHEN 'platform:role' THEN '/settings/platform-roles'
  WHEN 'platform:menu' THEN '/settings/platform-menus'
  WHEN 'platform:audit-log' THEN '/settings/platform-audit-logs'
  WHEN 'platform:config' THEN '/settings/dict'
  WHEN 'platform:dept' THEN '/settings/dept'
  WHEN 'platform:post' THEN '/settings/post'
  WHEN 'tenant:dashboard' THEN '/'
  WHEN 'tenant:base' THEN '/base'
  WHEN 'tenant:unit:list' THEN '/inventory/unit'
  WHEN 'tenant:user:list' THEN '/users'
  WHEN 'tenant:role:list' THEN '/settings/roles'
  WHEN 'tenant:menu:list' THEN '/settings/permissions'
  WHEN 'tenant:dict' THEN '/settings/dict'
  WHEN 'tenant:dept' THEN '/settings/dept'
  WHEN 'tenant:post' THEN '/settings/post'
  WHEN 'tenant:audit-log' THEN '/settings/operation-logs'
  WHEN 'tenant:product' THEN '/product'
  WHEN 'tenant:product:list' THEN '/product/list'
  WHEN 'tenant:category:list' THEN '/category/list'
  WHEN 'tenant:attribute:list' THEN '/product/attr'
  WHEN 'tenant:spec:list' THEN '/product/spec'
  WHEN 'tenant:warehouse' THEN '/warehouse'
  WHEN 'tenant:location:list' THEN '/warehouse/list'
  WHEN 'tenant:inventory' THEN '/inventory'
  WHEN 'tenant:inventory:list' THEN '/inventory/list'
  WHEN 'tenant:inventory:inbound' THEN '/inventory/inbound'
  WHEN 'tenant:inventory:outbound' THEN '/inventory/outbound'
  WHEN 'tenant:inventory:transaction:list' THEN '/inventory/transactions'
  WHEN 'tenant:inventory:alert:list' THEN '/inventory/alerts'
  WHEN 'tenant:portal' THEN '/website'
  WHEN 'tenant:portal:config' THEN '/base'
  WHEN 'tenant:portal:inquiry:list' THEN '/website/inquiry'
  ELSE `routePath`
END
WHERE `code` IN (
  'platform:dashboard',
  'platform:tenant',
  'platform:tenant:list',
  'platform:settings',
  'platform:user',
  'platform:role',
  'platform:menu',
  'platform:audit-log',
  'platform:config',
  'platform:dept',
  'platform:post',
  'tenant:dashboard',
  'tenant:base',
  'tenant:unit:list',
  'tenant:user:list',
  'tenant:role:list',
  'tenant:menu:list',
  'tenant:dict',
  'tenant:dept',
  'tenant:post',
  'tenant:audit-log',
  'tenant:product',
  'tenant:product:list',
  'tenant:category:list',
  'tenant:attribute:list',
  'tenant:spec:list',
  'tenant:warehouse',
  'tenant:location:list',
  'tenant:inventory',
  'tenant:inventory:list',
  'tenant:inventory:inbound',
  'tenant:inventory:outbound',
  'tenant:inventory:transaction:list',
  'tenant:inventory:alert:list',
  'tenant:portal',
  'tenant:portal:config',
  'tenant:portal:inquiry:list'
);

UPDATE `permissions` child
JOIN `permissions` parent ON parent.`code` = 'platform:tenant'
SET child.`parentId` = parent.`id`
WHERE child.`code` = 'platform:tenant:list';

UPDATE `permissions` child
JOIN `permissions` parent ON parent.`code` = 'platform:tenant:list'
SET child.`parentId` = parent.`id`
WHERE child.`code` IN (
  'platform:tenant:create',
  'platform:tenant:update',
  'platform:tenant:delete',
  'platform:tenant:approve',
  'platform:tenant:status'
);

UPDATE `permissions` child
JOIN `permissions` parent ON parent.`code` = 'platform:settings'
SET child.`parentId` = parent.`id`
WHERE child.`code` IN (
  'platform:user',
  'platform:role',
  'platform:menu',
  'platform:config',
  'platform:dept',
  'platform:post',
  'platform:audit-log'
);

INSERT INTO `roles` (
  `id`,
  `tenantId`,
  `name`,
  `isActive`,
  `code`,
  `scope`,
  `remark`,
  `isSystem`
)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  NULL,
  '平台超级管理员',
  1,
  'PLATFORM_ADMIN',
  'platform',
  '平台初始化角色，拥有平台域全部权限',
  1
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `isActive` = VALUES(`isActive`),
  `scope` = VALUES(`scope`),
  `remark` = VALUES(`remark`),
  `isSystem` = VALUES(`isSystem`);

INSERT IGNORE INTO `role_permissions` (`rolesId`, `permissionsId`)
SELECT '00000000-0000-0000-0000-000000000101', p.`id`
FROM `permissions` p
WHERE p.`scope` = 'platform';

INSERT IGNORE INTO `tenant_menu_permissions` (`tenantId`, `permissionsId`)
SELECT t.`id`, p.`id`
FROM `tenants` t
CROSS JOIN `permissions` p
WHERE p.`scope` = 'tenant'
  AND p.`type` = 'MENU';

INSERT INTO `users` (
  `id`,
  `tenantId`,
  `username`,
  `password`,
  `phone`,
  `email`,
  `realName`,
  `avatar`,
  `firstName`,
  `lastName`,
  `isPlatformAdmin`,
  `isActive`
)
SELECT
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'platform_admin',
  '$2b$10$6HWq76888O7xTjsgOlYIbuKCripi5pajGqGLdUv0iF5C8HCbXaZp2',
  NULL,
  NULL,
  '平台超级管理员',
  NULL,
  NULL,
  NULL,
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `id` = '00000000-0000-0000-0000-000000000001'
);

UPDATE `users`
SET
  `username` = 'platform_admin',
  `password` = '$2b$10$6HWq76888O7xTjsgOlYIbuKCripi5pajGqGLdUv0iF5C8HCbXaZp2',
  `realName` = '平台超级管理员',
  `isPlatformAdmin` = 1,
  `isActive` = 1
WHERE `id` = '00000000-0000-0000-0000-000000000001';

INSERT IGNORE INTO `user_roles` (`usersId`, `rolesId`)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101'
);
