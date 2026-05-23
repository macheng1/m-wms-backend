-- 用途：回滚部门管理与岗位管理基础表
-- 注意：会删除 departments、posts 表及其中数据，请谨慎执行。

DROP TABLE IF EXISTS `posts`;
DROP TABLE IF EXISTS `departments`;

DELETE rp
FROM `role_permissions` rp
JOIN `permissions` p ON p.`id` = rp.`permissionsId`
WHERE p.`code` IN ('platform:dept', 'platform:post', 'tenant:dept', 'tenant:post');

DELETE tmp
FROM `tenant_menu_permissions` tmp
JOIN `permissions` p ON p.`id` = tmp.`permissionsId`
WHERE p.`code` IN ('platform:dept', 'platform:post', 'tenant:dept', 'tenant:post');

DELETE FROM `permissions`
WHERE `code` IN ('platform:dept', 'platform:post', 'tenant:dept', 'tenant:post');
