-- 用途：新增部门管理与岗位管理基础表
-- 影响范围：departments、posts
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `parentId` char(36) DEFAULT NULL COMMENT '父部门ID，顶级为空',
  `deptCode` varchar(50) NOT NULL COMMENT '部门编码',
  `deptName` varchar(100) NOT NULL COMMENT '部门名称',
  `orderNum` int NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `leader` varchar(100) DEFAULT NULL COMMENT '负责人',
  `phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1正常，0停用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_departments_tenant_code` (`tenantId`,`deptCode`),
  KEY `IDX_departments_tenant_parent` (`tenantId`,`parentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `posts` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `postCode` varchar(50) NOT NULL COMMENT '岗位编码',
  `postName` varchar(100) NOT NULL COMMENT '岗位名称',
  `postSort` int NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1正常，0停用',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_posts_tenant_code` (`tenantId`,`postCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `parentId`, `routePath`, `description`)
VALUES
  ('platform:dept', 'platform', '平台部门', 'MENU', 0, '/settings/dept', '平台部门'),
  ('platform:post', 'platform', '平台岗位', 'MENU', 0, '/settings/post', '平台岗位'),
  ('tenant:dept', 'tenant', '部门管理', 'MENU', 0, '/settings/dept', '部门管理'),
  ('tenant:post', 'tenant', '岗位管理', 'MENU', 0, '/settings/post', '岗位管理')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `scope` = VALUES(`scope`),
  `type` = VALUES(`type`),
  `routePath` = VALUES(`routePath`),
  `description` = VALUES(`description`);

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'platform:settings'
SET child.`parentId` = parent.`id`
WHERE child.`code` IN ('platform:dept', 'platform:post');

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT '00000000-0000-0000-0000-000000000101', p.`id`
FROM `menus` p
WHERE p.`code` IN ('platform:dept', 'platform:post');

INSERT IGNORE INTO `tenant_menu_permissions` (`tenantId`, `menuId`)
SELECT t.`id`, p.`id`
FROM `tenants` t
CROSS JOIN `menus` p
WHERE p.`code` IN ('tenant:dept', 'tenant:post')
  AND t.`isApproved` = 1
  AND t.`isActive` = 1;
