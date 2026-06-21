-- 小程序轮播图管理菜单初始化
-- 影响范围：menus、role_menus

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
  'platform:miniapp:banner:list',
  'platform',
  '轮播图管理',
  'MENU',
  p.`id`,
  '/miniapp/banners',
  'miniapp/banners/page',
  NULL,
  6,
  0,
  1,
  '小程序首页轮播图管理'
FROM (SELECT MIN(`id`) AS `id` FROM `menus` WHERE `code` = 'platform:miniapp') p
WHERE p.`id` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'platform:miniapp:banner:list');

UPDATE `menus` child
JOIN (SELECT MIN(`id`) AS `id` FROM `menus` WHERE `code` = 'platform:miniapp') parent
SET
  child.`scope` = 'platform',
  child.`name` = '轮播图管理',
  child.`type` = 'MENU',
  child.`parentId` = parent.`id`,
  child.`routePath` = '/miniapp/banners',
  child.`componentPath` = 'miniapp/banners/page',
  child.`sortOrder` = 6,
  child.`isHidden` = 0,
  child.`isActive` = 1,
  child.`description` = '小程序首页轮播图管理'
WHERE child.`code` = 'platform:miniapp:banner:list'
  AND parent.`id` IS NOT NULL;

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT r.`id`, m.`id`
FROM `roles` r
JOIN `menus` m
WHERE r.`scope` = 'platform'
  AND r.`code` IN ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'admin', 'platform_admin')
  AND m.`code` = 'platform:miniapp:banner:list';
