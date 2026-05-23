-- 用途：回滚平台域/租户域权限模型 scope 字段
-- 风险：会移除平台/租户权限域信息，执行前需要确认业务代码已回退
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB
-- 使用时机：仅当已执行对应 update.sql 且需要回退代码/数据库版本时使用。
-- 不要在空库初始化后执行本文件，否则当前代码依赖的字段和表会被删除。

DELETE FROM `user_roles`
WHERE `usersId` = '00000000-0000-0000-0000-000000000001'
   OR `rolesId` = '00000000-0000-0000-0000-000000000101';

DELETE FROM `role_menus`
WHERE `roleId` = '00000000-0000-0000-0000-000000000101';

DELETE FROM `users`
WHERE `id` = '00000000-0000-0000-0000-000000000001';

DELETE FROM `roles`
WHERE `id` = '00000000-0000-0000-0000-000000000101';

DROP TABLE IF EXISTS `tenant_menu_permissions`;
DROP TABLE IF EXISTS `operation_logs`;

ALTER TABLE `roles` DROP COLUMN `scope`;
ALTER TABLE `tenants` DROP COLUMN `disabledReason`;
ALTER TABLE `tenants` DROP COLUMN `auditRemark`;
ALTER TABLE `tenants` DROP COLUMN `approvedAt`;
ALTER TABLE `tenants` DROP COLUMN `expiresAt`;
ALTER TABLE `tenants` DROP COLUMN `lifecycleStatus`;
ALTER TABLE `dictionaries` DROP COLUMN `parentId`;
ALTER TABLE `dictionaries` DROP COLUMN `allowTenantOverride`;
ALTER TABLE `dictionaries` DROP COLUMN `allowTenantExtend`;
ALTER TABLE `dictionaries` DROP COLUMN `isSystem`;
ALTER TABLE `dictionaries` DROP COLUMN `scope`;
ALTER TABLE `permissions` DROP COLUMN `isHidden`;
ALTER TABLE `permissions` DROP COLUMN `sortOrder`;
ALTER TABLE `permissions` DROP COLUMN `icon`;
ALTER TABLE `permissions` DROP COLUMN `routePath`;
ALTER TABLE `permissions` DROP COLUMN `scope`;
