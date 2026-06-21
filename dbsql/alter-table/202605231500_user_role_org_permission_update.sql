-- 用途：补齐用户组织归属、角色数据权限范围和角色可见部门
-- 来源需求：用户绑定部门/岗位，角色支持菜单权限与数据权限，角色可绑定自定义部门范围
-- 影响范围：users、roles、role_departments
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deptId') = 0,
  "ALTER TABLE `users` ADD COLUMN `deptId` char(36) DEFAULT NULL COMMENT '所属部门ID' AFTER `lastName`",
  "SELECT 'skip users.deptId'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'postId') = 0,
  "ALTER TABLE `users` ADD COLUMN `postId` char(36) DEFAULT NULL COMMENT '所属岗位ID' AFTER `deptId`",
  "SELECT 'skip users.postId'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'IDX_users_dept') = 0,
  "ALTER TABLE `users` ADD INDEX `IDX_users_dept` (`deptId`)",
  "SELECT 'skip IDX_users_dept'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'IDX_users_post') = 0,
  "ALTER TABLE `users` ADD INDEX `IDX_users_post` (`postId`)",
  "SELECT 'skip IDX_users_post'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'dataScope') = 0,
  "ALTER TABLE `roles` ADD COLUMN `dataScope` enum('ALL','CUSTOM','DEPT','DEPT_AND_CHILD','SELF') NOT NULL DEFAULT 'ALL' COMMENT '数据权限范围' AFTER `isSystem`",
  "SELECT 'skip roles.dataScope'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `role_departments` (
  `roleId` char(36) NOT NULL,
  `departmentId` char(36) NOT NULL,
  PRIMARY KEY (`roleId`,`departmentId`),
  KEY `IDX_role_departments_departmentId` (`departmentId`),
  CONSTRAINT `FK_role_departments_role` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_role_departments_department` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
