-- 用途：将菜单数据与角色菜单关系统一迁移到 menus / role_menus。
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

CREATE TABLE IF NOT EXISTS `menus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL COMMENT '菜单唯一标识码，需与前端 MENU_CONFIG 的 code 一一对应',
  `scope` enum('platform','tenant') NOT NULL DEFAULT 'tenant' COMMENT '菜单归属域：platform-平台超级管理员，tenant-租户管理员/员工',
  `name` varchar(255) NOT NULL COMMENT '菜单名称',
  `routePath` varchar(255) DEFAULT NULL COMMENT '前端菜单路由，对应 my-wms 的实际页面路径',
  `componentPath` varchar(255) DEFAULT NULL COMMENT '前端组件路径，动态路由场景使用',
  `icon` varchar(255) DEFAULT NULL COMMENT '前端菜单图标标识',
  `sortOrder` int NOT NULL DEFAULT 0 COMMENT '菜单排序',
  `isHidden` tinyint NOT NULL DEFAULT 0 COMMENT '是否隐藏菜单',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1启用，0停用',
  `type` enum('DIRECTORY','MENU','BUTTON','API') NOT NULL DEFAULT 'MENU' COMMENT '菜单类型：目录、菜单、按钮、接口',
  `parentId` int NOT NULL DEFAULT 0 COMMENT '父级菜单ID，用于后台配置时的树形展示',
  `description` varchar(255) DEFAULT NULL COMMENT '描述信息',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_menus_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `menus` (
  `id`, `code`, `scope`, `name`, `routePath`, `componentPath`, `icon`,
  `sortOrder`, `isHidden`, `isActive`, `type`, `parentId`, `description`, `createdAt`
)
SELECT
  `id`, `code`, `scope`, `name`, `routePath`, `componentPath`, `icon`,
  `sortOrder`, `isHidden`, `isActive`, `type`, `parentId`, `description`, `createdAt`
FROM `permissions`;

CREATE TABLE IF NOT EXISTS `role_menus` (
  `roleId` char(36) NOT NULL,
  `menuId` int NOT NULL,
  PRIMARY KEY (`roleId`,`menuId`),
  KEY `IDX_role_menus_menuId` (`menuId`),
  CONSTRAINT `FK_role_menus_role` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_role_menus_menu` FOREIGN KEY (`menuId`) REFERENCES `menus` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT `rolesId`, `permissionsId`
FROM `role_permissions`;

CREATE TABLE IF NOT EXISTS `tenant_menu_permissions_new` (
  `tenantId` char(36) NOT NULL,
  `menuId` int NOT NULL,
  PRIMARY KEY (`tenantId`,`menuId`),
  KEY `IDX_tenant_menu_permissions_menuId` (`menuId`),
  CONSTRAINT `FK_tenant_menu_permissions_new_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_tenant_menu_permissions_new_menu` FOREIGN KEY (`menuId`) REFERENCES `menus` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `tenant_menu_permissions_new` (`tenantId`, `menuId`)
SELECT `tenantId`, `permissionsId`
FROM `tenant_menu_permissions`;

DROP TABLE IF EXISTS `tenant_menu_permissions`;
RENAME TABLE `tenant_menu_permissions_new` TO `tenant_menu_permissions`;
DROP TABLE IF EXISTS `role_permissions`;
