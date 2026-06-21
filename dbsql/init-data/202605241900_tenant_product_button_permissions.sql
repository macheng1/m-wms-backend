-- 用途：补齐租户端产品基础资料按钮权限
-- 影响范围：menus、tenant_menu_permissions、role_menus

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
VALUES
  ('tenant:product:status', 'tenant', '启用/禁用产品', 'BUTTON', NULL, NULL, NULL, 40, 1, 1, 0, '启用或禁用产品'),
  ('tenant:category:create', 'tenant', '新增类目', 'BUTTON', NULL, NULL, NULL, 10, 1, 1, 0, '新增类目'),
  ('tenant:category:update', 'tenant', '编辑类目', 'BUTTON', NULL, NULL, NULL, 20, 1, 1, 0, '编辑类目'),
  ('tenant:category:delete', 'tenant', '删除类目', 'BUTTON', NULL, NULL, NULL, 30, 1, 1, 0, '删除类目'),
  ('tenant:category:status', 'tenant', '启用/禁用类目', 'BUTTON', NULL, NULL, NULL, 40, 1, 1, 0, '启用或禁用类目'),
  ('tenant:attribute:create', 'tenant', '新增属性', 'BUTTON', NULL, NULL, NULL, 10, 1, 1, 0, '新增属性'),
  ('tenant:attribute:update', 'tenant', '编辑属性', 'BUTTON', NULL, NULL, NULL, 20, 1, 1, 0, '编辑属性'),
  ('tenant:attribute:delete', 'tenant', '删除属性', 'BUTTON', NULL, NULL, NULL, 30, 1, 1, 0, '删除属性'),
  ('tenant:attribute:status', 'tenant', '启用/禁用属性', 'BUTTON', NULL, NULL, NULL, 40, 1, 1, 0, '启用或禁用属性'),
  ('tenant:attribute:import', 'tenant', '导入属性', 'BUTTON', NULL, NULL, NULL, 50, 1, 1, 0, '导入属性'),
  ('tenant:spec:create', 'tenant', '新增规格', 'BUTTON', NULL, NULL, NULL, 10, 1, 1, 0, '新增规格'),
  ('tenant:spec:update', 'tenant', '编辑规格', 'BUTTON', NULL, NULL, NULL, 20, 1, 1, 0, '编辑规格'),
  ('tenant:spec:delete', 'tenant', '删除规格', 'BUTTON', NULL, NULL, NULL, 30, 1, 1, 0, '删除规格'),
  ('tenant:spec:status', 'tenant', '启用/禁用规格', 'BUTTON', NULL, NULL, NULL, 40, 1, 1, 0, '启用或禁用规格'),
  ('tenant:unit:create', 'tenant', '新增单位', 'BUTTON', NULL, NULL, NULL, 10, 1, 1, 0, '新增单位'),
  ('tenant:unit:update', 'tenant', '编辑单位', 'BUTTON', NULL, NULL, NULL, 20, 1, 1, 0, '编辑单位'),
  ('tenant:unit:delete', 'tenant', '删除单位', 'BUTTON', NULL, NULL, NULL, 30, 1, 1, 0, '删除单位'),
  ('tenant:unit:status', 'tenant', '启用/禁用单位', 'BUTTON', NULL, NULL, NULL, 40, 1, 1, 0, '启用或禁用单位')
ON DUPLICATE KEY UPDATE
  `scope` = VALUES(`scope`),
  `name` = VALUES(`name`),
  `type` = VALUES(`type`),
  `routePath` = VALUES(`routePath`),
  `componentPath` = VALUES(`componentPath`),
  `icon` = VALUES(`icon`),
  `sortOrder` = VALUES(`sortOrder`),
  `isHidden` = VALUES(`isHidden`),
  `isActive` = VALUES(`isActive`),
  `description` = VALUES(`description`);

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:product:list'
SET child.`parentId` = parent.`id`
WHERE child.`code` IN (
  'tenant:product:create',
  'tenant:product:update',
  'tenant:product:delete',
  'tenant:product:status',
  'tenant:product:import'
);

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:category:list'
SET child.`parentId` = parent.`id`
WHERE child.`code` IN (
  'tenant:category:create',
  'tenant:category:update',
  'tenant:category:delete',
  'tenant:category:status'
);

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:attribute:list'
SET child.`parentId` = parent.`id`
WHERE child.`code` IN (
  'tenant:attribute:create',
  'tenant:attribute:update',
  'tenant:attribute:delete',
  'tenant:attribute:status',
  'tenant:attribute:import'
);

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:spec:list'
SET child.`parentId` = parent.`id`
WHERE child.`code` IN (
  'tenant:spec:create',
  'tenant:spec:update',
  'tenant:spec:delete',
  'tenant:spec:status'
);

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:unit:list'
SET child.`parentId` = parent.`id`
WHERE child.`code` IN (
  'tenant:unit:create',
  'tenant:unit:update',
  'tenant:unit:delete',
  'tenant:unit:status'
);

INSERT IGNORE INTO `tenant_menu_permissions` (`tenantId`, `menuId`)
SELECT t.`id`, m.`id`
FROM `tenants` t
JOIN `menus` m ON m.`code` IN (
  'tenant:product:status',
  'tenant:category:create',
  'tenant:category:update',
  'tenant:category:delete',
  'tenant:category:status',
  'tenant:attribute:create',
  'tenant:attribute:update',
  'tenant:attribute:delete',
  'tenant:attribute:status',
  'tenant:attribute:import',
  'tenant:spec:create',
  'tenant:spec:update',
  'tenant:spec:delete',
  'tenant:spec:status',
  'tenant:unit:create',
  'tenant:unit:update',
  'tenant:unit:delete',
  'tenant:unit:status'
);

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT r.`id`, m.`id`
FROM `roles` r
JOIN `menus` m ON m.`scope` = 'tenant'
WHERE r.`scope` = 'tenant'
  AND r.`code` = 'ADMIN'
  AND m.`code` IN (
    'tenant:product:status',
    'tenant:category:create',
    'tenant:category:update',
    'tenant:category:delete',
    'tenant:category:status',
    'tenant:attribute:create',
    'tenant:attribute:update',
    'tenant:attribute:delete',
    'tenant:attribute:status',
    'tenant:attribute:import',
    'tenant:spec:create',
    'tenant:spec:update',
    'tenant:spec:delete',
    'tenant:spec:status',
    'tenant:unit:create',
    'tenant:unit:update',
    'tenant:unit:delete',
    'tenant:unit:status'
  );
