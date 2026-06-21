-- 小程序管理菜单初始化
-- 影响范围：menus、role_menus

-- 清理早期误写入的租户端小程序菜单。
DELETE tmp
FROM `tenant_menu_permissions` tmp
JOIN `menus` m ON m.`id` = tmp.`menuId`
WHERE m.`code` IN (
  'tenant:miniapp',
  'tenant:miniapp:member:list',
  'tenant:miniapp:member:status',
  'tenant:miniapp:member:remark'
);

DELETE rm
FROM `role_menus` rm
JOIN `menus` m ON m.`id` = rm.`menuId`
WHERE m.`code` IN (
  'tenant:miniapp',
  'tenant:miniapp:member:list',
  'tenant:miniapp:member:status',
  'tenant:miniapp:member:remark'
);

DELETE FROM `menus`
WHERE `code` IN (
  'tenant:miniapp',
  'tenant:miniapp:member:list',
  'tenant:miniapp:member:status',
  'tenant:miniapp:member:remark'
);

INSERT INTO `menus` (
  `code`,
  `scope`,
  `name`,
  `type`,
  `parentId`,
  `routePath`,
  `componentPath`,
  `icon`,
  `sortOrder`,
  `isHidden`,
  `isActive`,
  `description`
)
SELECT
  'platform:miniapp',
  'platform',
  '小程序管理',
  'DIRECTORY',
  0,
  '/miniapp',
  NULL,
  'IconPhoneStroked',
  80,
  0,
  1,
  '平台小程序管理'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'platform:miniapp');

UPDATE `menus`
SET
  `scope` = 'platform',
  `name` = '小程序管理',
  `type` = 'DIRECTORY',
  `parentId` = 0,
  `routePath` = '/miniapp',
  `componentPath` = NULL,
  `icon` = 'IconPhoneStroked',
  `sortOrder` = 80,
  `isHidden` = 0,
  `isActive` = 1,
  `description` = '平台小程序管理'
WHERE `code` = 'platform:miniapp';

INSERT INTO `menus` (
  `code`,
  `scope`,
  `name`,
  `type`,
  `parentId`,
  `routePath`,
  `componentPath`,
  `icon`,
  `sortOrder`,
  `isHidden`,
  `isActive`,
  `description`
)
SELECT
  'platform:miniapp:member:list',
  'platform',
  '会员列表',
  'MENU',
  p.`id`,
  '/miniapp/members',
  'miniapp/members/page',
  NULL,
  10,
  0,
  1,
  '小程序会员列表'
FROM (SELECT MIN(`id`) AS `id` FROM `menus` WHERE `code` = 'platform:miniapp') p
WHERE p.`id` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'platform:miniapp:member:list');

UPDATE `menus` child
JOIN (SELECT MIN(`id`) AS `id` FROM `menus` WHERE `code` = 'platform:miniapp') parent
SET
  child.`scope` = 'platform',
  child.`name` = '会员列表',
  child.`type` = 'MENU',
  child.`parentId` = parent.`id`,
  child.`routePath` = '/miniapp/members',
  child.`componentPath` = 'miniapp/members/page',
  child.`icon` = NULL,
  child.`sortOrder` = 10,
  child.`isHidden` = 0,
  child.`isActive` = 1,
  child.`description` = '小程序会员列表'
WHERE child.`code` = 'platform:miniapp:member:list'
  AND parent.`id` IS NOT NULL;

INSERT INTO `menus` (
  `code`,
  `scope`,
  `name`,
  `type`,
  `parentId`,
  `routePath`,
  `componentPath`,
  `icon`,
  `sortOrder`,
  `isHidden`,
  `isActive`,
  `description`
)
SELECT
  menu_item.`code`,
  'platform',
  menu_item.`name`,
  'BUTTON',
  p.`id`,
  NULL,
  NULL,
  NULL,
  menu_item.`sortOrder`,
  1,
  1,
  menu_item.`description`
FROM (SELECT MIN(`id`) AS `id` FROM `menus` WHERE `code` = 'platform:miniapp:member:list') p
JOIN (
  SELECT 'platform:miniapp:member:status' AS `code`, '启用/禁用会员' AS `name`, 10 AS `sortOrder`, '启用或禁用小程序会员' AS `description`
  UNION ALL
  SELECT 'platform:miniapp:member:remark' AS `code`, '保存会员备注' AS `name`, 20 AS `sortOrder`, '保存小程序会员后台备注' AS `description`
) menu_item
WHERE p.`id` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `menus` existing WHERE existing.`code` = menu_item.`code`);

UPDATE `menus` child
JOIN (SELECT MIN(`id`) AS `id` FROM `menus` WHERE `code` = 'platform:miniapp:member:list') parent
JOIN (
  SELECT 'platform:miniapp:member:status' AS `code`, '启用/禁用会员' AS `name`, 10 AS `sortOrder`, '启用或禁用小程序会员' AS `description`
  UNION ALL
  SELECT 'platform:miniapp:member:remark' AS `code`, '保存会员备注' AS `name`, 20 AS `sortOrder`, '保存小程序会员后台备注' AS `description`
) menu_item ON menu_item.`code` = child.`code`
SET
  child.`scope` = 'platform',
  child.`name` = menu_item.`name`,
  child.`type` = 'BUTTON',
  child.`parentId` = parent.`id`,
  child.`routePath` = NULL,
  child.`componentPath` = NULL,
  child.`icon` = NULL,
  child.`sortOrder` = menu_item.`sortOrder`,
  child.`isHidden` = 1,
  child.`isActive` = 1,
  child.`description` = menu_item.`description`
WHERE parent.`id` IS NOT NULL;

CREATE TEMPORARY TABLE `tmp_miniapp_menu_keep` AS
SELECT `code`, MIN(`id`) AS `keepId`
FROM `menus`
WHERE `code` IN (
  'platform:miniapp',
  'platform:miniapp:member:list',
  'platform:miniapp:member:status',
  'platform:miniapp:member:remark'
)
GROUP BY `code`;

UPDATE `menus` child
JOIN `menus` old_parent ON old_parent.`id` = child.`parentId`
JOIN `tmp_miniapp_menu_keep` keep_parent ON keep_parent.`code` = old_parent.`code`
SET child.`parentId` = keep_parent.`keepId`
WHERE old_parent.`id` <> keep_parent.`keepId`;

UPDATE IGNORE `role_menus` rm
JOIN `menus` m ON m.`id` = rm.`menuId`
JOIN `tmp_miniapp_menu_keep` keep_menu ON keep_menu.`code` = m.`code`
SET rm.`menuId` = keep_menu.`keepId`
WHERE m.`id` <> keep_menu.`keepId`;

DELETE rm
FROM `role_menus` rm
JOIN `menus` m ON m.`id` = rm.`menuId`
JOIN `tmp_miniapp_menu_keep` keep_menu ON keep_menu.`code` = m.`code`
WHERE m.`id` <> keep_menu.`keepId`;

DELETE m
FROM `menus` m
JOIN `tmp_miniapp_menu_keep` keep_menu ON keep_menu.`code` = m.`code`
WHERE m.`id` <> keep_menu.`keepId`;

DROP TEMPORARY TABLE `tmp_miniapp_menu_keep`;

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT r.`id`, m.`id`
FROM `roles` r
JOIN `menus` m ON m.`code` IN (
  'platform:miniapp',
  'platform:miniapp:member:list',
  'platform:miniapp:member:status',
  'platform:miniapp:member:remark'
)
WHERE r.`scope` = 'platform'
  AND r.`tenantId` IS NULL;
