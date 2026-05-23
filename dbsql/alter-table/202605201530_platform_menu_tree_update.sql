-- 用途：补齐平台菜单层级，让平台菜单列表/树形展示不再全部显示为顶级菜单
-- 来源需求：my-wms 平台菜单管理页面需要展示完整平台菜单层级
-- 影响范围：permissions
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

ALTER TABLE `permissions`
  MODIFY COLUMN `type` enum('DIRECTORY','MENU','BUTTON','API') NOT NULL DEFAULT 'MENU'
  COMMENT '权限类型：目录、菜单、按钮、接口';

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions' AND COLUMN_NAME = 'componentPath') = 0,
  "ALTER TABLE `permissions` ADD COLUMN `componentPath` varchar(255) DEFAULT NULL COMMENT '前端组件路径，动态路由场景使用' AFTER `routePath`",
  "SELECT 'skip permissions.componentPath'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions' AND COLUMN_NAME = 'isActive') = 0,
  "ALTER TABLE `permissions` ADD COLUMN `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1启用，0停用' AFTER `isHidden`",
  "SELECT 'skip permissions.isActive'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO `permissions` (`code`, `scope`, `name`, `type`, `parentId`, `routePath`, `description`)
VALUES ('platform:settings', 'platform', '系统设置', 'DIRECTORY', 0, '/settings', '系统设置')
ON DUPLICATE KEY UPDATE
  `scope` = VALUES(`scope`),
  `name` = VALUES(`name`),
  `type` = VALUES(`type`),
  `routePath` = VALUES(`routePath`),
  `description` = VALUES(`description`);

UPDATE `permissions`
SET `type` = 'DIRECTORY'
WHERE `code` IN (
  'platform:tenant',
  'platform:settings',
  'tenant:product',
  'tenant:warehouse',
  'tenant:inventory',
  'tenant:order',
  'tenant:portal'
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
  'platform:permission',
  'platform:config',
  'platform:dept',
  'platform:post',
  'platform:audit-log'
);
