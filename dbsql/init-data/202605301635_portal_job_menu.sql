-- 官网招聘管理菜单
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
  'tenant:portal:job:list',
  'tenant',
  '招聘管理',
  'MENU',
  p.`id`,
  '/website/jobs',
  'website/jobs/page',
  NULL,
  30,
  0,
  1,
  '招聘管理'
FROM `menus` p
WHERE p.`code` = 'tenant:portal'
  AND NOT EXISTS (
    SELECT 1 FROM `menus` m WHERE m.`code` = 'tenant:portal:job:list'
  );

-- 已有租户默认授予招聘菜单，后续仍可在平台租户菜单中取消。
INSERT IGNORE INTO `tenant_menu_permissions` (`tenantId`, `menuId`)
SELECT t.`id`, m.`id`
FROM `tenants` t
JOIN `menus` m ON m.`code` = 'tenant:portal:job:list'
WHERE t.`deletedAt` IS NULL;
