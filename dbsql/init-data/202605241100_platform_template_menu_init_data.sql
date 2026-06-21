-- 用途：初始化平台模板管理菜单
-- 影响范围：menus、role_menus

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'platform:template:category', 'platform', '标准类目', 'MENU', '/settings/platform-templates/categories', NULL, 'IconList', 10, 0, 1, 0, '平台标准类目模板'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'platform:template:category');

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'platform:template:attribute', 'platform', '标准属性', 'MENU', '/settings/platform-templates/attributes', NULL, 'IconAppCenter', 20, 0, 1, 0, '平台标准属性模板'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'platform:template:attribute');

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'platform:template:unit', 'platform', '标准单位', 'MENU', '/settings/platform-templates/units', NULL, 'IconKanban', 30, 0, 1, 0, '平台标准单位模板'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'platform:template:unit');

UPDATE `menus`
SET `scope` = 'platform',
    `type` = 'MENU',
    `name` = CASE `code`
      WHEN 'platform:template:category' THEN '标准类目'
      WHEN 'platform:template:attribute' THEN '标准属性'
      WHEN 'platform:template:unit' THEN '标准单位'
      ELSE `name`
    END,
    `routePath` = CASE `code`
      WHEN 'platform:template:category' THEN '/settings/platform-templates/categories'
      WHEN 'platform:template:attribute' THEN '/settings/platform-templates/attributes'
      WHEN 'platform:template:unit' THEN '/settings/platform-templates/units'
      ELSE `routePath`
    END,
    `icon` = CASE `code`
      WHEN 'platform:template:category' THEN 'IconList'
      WHEN 'platform:template:attribute' THEN 'IconAppCenter'
      WHEN 'platform:template:unit' THEN 'IconKanban'
      ELSE `icon`
    END,
    `isHidden` = 0,
    `isActive` = 1
WHERE `code` IN (
  'platform:template:category',
  'platform:template:attribute',
  'platform:template:unit'
);

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT r.id, m.id
FROM roles r
JOIN menus m ON m.code IN (
  'platform:template:category',
  'platform:template:attribute',
  'platform:template:unit'
)
WHERE r.scope = 'platform'
  AND r.tenantId IS NULL;
