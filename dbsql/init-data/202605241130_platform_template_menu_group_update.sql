-- 用途：将平台模板菜单从系统设置中独立为一级“模板管理”
-- 影响范围：menus、role_menus

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'platform:template', 'platform', '模板管理', 'DIRECTORY', '/settings/platform-templates', NULL, 'IconList', 30, 0, 1, 0, '平台标准模板管理'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'platform:template');

UPDATE `menus`
SET `scope` = 'platform',
    `name` = '模板管理',
    `type` = 'DIRECTORY',
    `routePath` = '/settings/platform-templates',
    `componentPath` = NULL,
    `icon` = 'IconList',
    `sortOrder` = 30,
    `isHidden` = 0,
    `isActive` = 1,
    `parentId` = 0,
    `description` = '平台标准模板管理'
WHERE `code` = 'platform:template';

SET @template_parent_id = (
  SELECT `id`
  FROM `menus`
  WHERE `code` = 'platform:template'
  ORDER BY `id`
  LIMIT 1
);

UPDATE `menus`
SET `parentId` = @template_parent_id,
    `sortOrder` = CASE `code`
      WHEN 'platform:template:category' THEN 10
      WHEN 'platform:template:attribute' THEN 20
      WHEN 'platform:template:unit' THEN 30
      ELSE `sortOrder`
    END
WHERE `code` IN (
  'platform:template:category',
  'platform:template:attribute',
  'platform:template:unit'
);

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT r.id, m.id
FROM roles r
JOIN menus m ON m.code IN (
  'platform:template',
  'platform:template:category',
  'platform:template:attribute',
  'platform:template:unit'
)
WHERE r.scope = 'platform'
  AND r.tenantId IS NULL;
