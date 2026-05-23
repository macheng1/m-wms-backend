-- 用途：为管理端平台域/租户域菜单模型增加 scope 字段
-- 来源需求：平台超级管理员维护平台菜单/角色/菜单，租户管理员只分配本租户角色菜单
-- 影响范围：permissions、roles
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB
-- 说明：本脚本支持重复执行；已存在的字段会自动跳过。
-- 常见错误：
-- 1. 1060 Duplicate column name：说明字段已存在，当前脚本会自动跳过。
-- 2. 如果是空库已执行 init/init-schema.sql，则无需执行本脚本，只需执行 init-data/*_data.sql。

CREATE TABLE IF NOT EXISTS `menus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL COMMENT '菜单唯一标识码，需与前端 MENU_CONFIG 的 code 一一对应',
  `name` varchar(255) NOT NULL COMMENT '菜单名称',
  `type` enum('DIRECTORY','MENU','BUTTON','API') NOT NULL DEFAULT 'MENU' COMMENT '菜单类型：目录、菜单、按钮、接口',
  `parentId` int NOT NULL DEFAULT 0 COMMENT '父级菜单ID，用于后台配置时的树形展示',
  `description` varchar(255) DEFAULT NULL COMMENT '描述信息',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_menus_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `menus` (`id`, `code`, `name`, `type`, `parentId`, `description`, `createdAt`)
SELECT `id`, `code`, `name`, `type`, `parentId`, `description`, `createdAt`
FROM `permissions`;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menus' AND COLUMN_NAME = 'scope') = 0,
  "ALTER TABLE `menus` ADD COLUMN `scope` enum('platform','tenant') NOT NULL DEFAULT 'tenant' COMMENT '菜单归属域：platform-平台超级管理员，tenant-租户管理员/员工' AFTER `code`",
  "SELECT 'skip menus.scope'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menus' AND COLUMN_NAME = 'routePath') = 0,
  "ALTER TABLE `menus` ADD COLUMN `routePath` varchar(255) DEFAULT NULL COMMENT '前端菜单路由，对应 my-wms 的实际页面路径' AFTER `name`",
  "SELECT 'skip menus.routePath'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menus' AND COLUMN_NAME = 'icon') = 0,
  "ALTER TABLE `menus` ADD COLUMN `icon` varchar(255) DEFAULT NULL COMMENT '前端菜单图标标识' AFTER `routePath`",
  "SELECT 'skip menus.icon'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menus' AND COLUMN_NAME = 'componentPath') = 0,
  "ALTER TABLE `menus` ADD COLUMN `componentPath` varchar(255) DEFAULT NULL COMMENT '前端组件路径，动态路由场景使用' AFTER `routePath`",
  "SELECT 'skip menus.componentPath'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menus' AND COLUMN_NAME = 'sortOrder') = 0,
  "ALTER TABLE `menus` ADD COLUMN `sortOrder` int NOT NULL DEFAULT 0 COMMENT '菜单排序' AFTER `icon`",
  "SELECT 'skip menus.sortOrder'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menus' AND COLUMN_NAME = 'isHidden') = 0,
  "ALTER TABLE `menus` ADD COLUMN `isHidden` tinyint NOT NULL DEFAULT 0 COMMENT '是否隐藏菜单' AFTER `sortOrder`",
  "SELECT 'skip menus.isHidden'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menus' AND COLUMN_NAME = 'isActive') = 0,
  "ALTER TABLE `menus` ADD COLUMN `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1启用，0停用' AFTER `isHidden`",
  "SELECT 'skip menus.isActive'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE `menus`
  MODIFY COLUMN `type` enum('DIRECTORY','MENU','BUTTON','API') NOT NULL DEFAULT 'MENU'
  COMMENT '菜单类型：目录、菜单、按钮、接口';

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'scope') = 0,
  "ALTER TABLE `roles` ADD COLUMN `scope` enum('platform','tenant') NOT NULL DEFAULT 'tenant' COMMENT '角色归属域：platform-平台角色，tenant-租户角色' AFTER `code`",
  "SELECT 'skip roles.scope'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `menus`
SET `scope` = 'platform'
WHERE `code` LIKE 'platform:%';

UPDATE `menus`
SET `scope` = 'tenant'
WHERE `code` LIKE 'tenant:%';

UPDATE `roles`
SET `scope` = CASE
  WHEN `tenantId` IS NULL THEN 'platform'
  ELSE 'tenant'
END;

CREATE TABLE IF NOT EXISTS `tenant_menu_permissions` (
  `tenantId` char(36) NOT NULL,
  `menuId` int NOT NULL,
  PRIMARY KEY (`tenantId`,`menuId`),
  KEY `IDX_tenant_menu_permissions_menuId` (`menuId`),
  CONSTRAINT `FK_tenant_menu_permissions_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_tenant_menu_permissions_menu` FOREIGN KEY (`menuId`) REFERENCES `menus` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'lifecycleStatus') = 0,
  "ALTER TABLE `tenants` ADD COLUMN `lifecycleStatus` enum('pending','active','rejected','disabled','expired') NOT NULL DEFAULT 'pending' COMMENT '租户生命周期状态' AFTER `isApproved`",
  "SELECT 'skip tenants.lifecycleStatus'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'expiresAt') = 0,
  "ALTER TABLE `tenants` ADD COLUMN `expiresAt` datetime DEFAULT NULL COMMENT '到期时间' AFTER `lifecycleStatus`",
  "SELECT 'skip tenants.expiresAt'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'approvedAt') = 0,
  "ALTER TABLE `tenants` ADD COLUMN `approvedAt` datetime DEFAULT NULL COMMENT '审核通过时间' AFTER `expiresAt`",
  "SELECT 'skip tenants.approvedAt'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'auditRemark') = 0,
  "ALTER TABLE `tenants` ADD COLUMN `auditRemark` text DEFAULT NULL COMMENT '审核备注' AFTER `approvedAt`",
  "SELECT 'skip tenants.auditRemark'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'disabledReason') = 0,
  "ALTER TABLE `tenants` ADD COLUMN `disabledReason` text DEFAULT NULL COMMENT '禁用原因' AFTER `auditRemark`",
  "SELECT 'skip tenants.disabledReason'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `tenants`
SET
  `lifecycleStatus` = CASE
    WHEN `isApproved` = 1 AND `isActive` = 1 THEN 'active'
    WHEN `isApproved` = 0 AND `isActive` = 0 THEN 'rejected'
    WHEN `isActive` = 0 THEN 'disabled'
    ELSE 'pending'
  END,
  `approvedAt` = CASE
    WHEN `isApproved` = 1 AND `isActive` = 1 THEN COALESCE(`approvedAt`, `updatedAt`)
    ELSE `approvedAt`
  END;

CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，平台操作为空',
  `userId` char(36) DEFAULT NULL COMMENT '操作人ID',
  `username` varchar(255) DEFAULT NULL COMMENT '操作人账号',
  `scope` enum('platform','tenant') NOT NULL COMMENT '操作域',
  `module` varchar(255) NOT NULL COMMENT '业务模块',
  `action` varchar(255) NOT NULL COMMENT '操作动作',
  `targetType` varchar(255) DEFAULT NULL COMMENT '目标类型',
  `targetId` varchar(255) DEFAULT NULL COMMENT '目标ID',
  `description` text DEFAULT NULL COMMENT '操作描述',
  `beforeData` json DEFAULT NULL COMMENT '操作前数据',
  `afterData` json DEFAULT NULL COMMENT '操作后数据',
  `ip` varchar(255) DEFAULT NULL COMMENT 'IP地址',
  PRIMARY KEY (`id`),
  KEY `IDX_operation_logs_tenant_created` (`tenantId`,`createdAt`),
  KEY `IDX_operation_logs_user_created` (`userId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dictionaries' AND COLUMN_NAME = 'scope') = 0,
  "ALTER TABLE `dictionaries` ADD COLUMN `scope` enum('platform','tenant') NOT NULL DEFAULT 'platform' COMMENT '字典归属域：platform-平台标准字典，tenant-租户自定义字典' AFTER `tenantId`",
  "SELECT 'skip dictionaries.scope'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dictionaries' AND COLUMN_NAME = 'isSystem') = 0,
  "ALTER TABLE `dictionaries` ADD COLUMN `isSystem` tinyint NOT NULL DEFAULT 0 COMMENT '是否系统内置字典，内置字典不建议删除' AFTER `isActive`",
  "SELECT 'skip dictionaries.isSystem'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dictionaries' AND COLUMN_NAME = 'allowTenantExtend') = 0,
  "ALTER TABLE `dictionaries` ADD COLUMN `allowTenantExtend` tinyint NOT NULL DEFAULT 0 COMMENT '是否允许租户扩展' AFTER `isSystem`",
  "SELECT 'skip dictionaries.allowTenantExtend'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dictionaries' AND COLUMN_NAME = 'allowTenantOverride') = 0,
  "ALTER TABLE `dictionaries` ADD COLUMN `allowTenantOverride` tinyint NOT NULL DEFAULT 0 COMMENT '是否允许租户覆盖' AFTER `allowTenantExtend`",
  "SELECT 'skip dictionaries.allowTenantOverride'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dictionaries' AND COLUMN_NAME = 'parentId') = 0,
  "ALTER TABLE `dictionaries` ADD COLUMN `parentId` char(36) DEFAULT NULL COMMENT '继承的平台字典ID' AFTER `allowTenantOverride`",
  "SELECT 'skip dictionaries.parentId'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `dictionaries`
SET `scope` = CASE
  WHEN `tenantId` IS NULL THEN 'platform'
  ELSE 'tenant'
END;
