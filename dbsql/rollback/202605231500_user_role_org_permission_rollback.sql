-- 用途：回滚用户组织归属和角色数据权限结构
-- 对应脚本：alter-table/202605231500_user_role_org_permission_update.sql
-- 风险提示：会删除用户部门/岗位绑定、角色数据权限范围和角色自定义部门绑定数据
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

DROP TABLE IF EXISTS `role_departments`;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'IDX_users_dept') > 0,
  "ALTER TABLE `users` DROP INDEX `IDX_users_dept`",
  "SELECT 'skip drop IDX_users_dept'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'IDX_users_post') > 0,
  "ALTER TABLE `users` DROP INDEX `IDX_users_post`",
  "SELECT 'skip drop IDX_users_post'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'postId') > 0,
  "ALTER TABLE `users` DROP COLUMN `postId`",
  "SELECT 'skip drop users.postId'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deptId') > 0,
  "ALTER TABLE `users` DROP COLUMN `deptId`",
  "SELECT 'skip drop users.deptId'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'dataScope') > 0,
  "ALTER TABLE `roles` DROP COLUMN `dataScope`",
  "SELECT 'skip drop roles.dataScope'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
