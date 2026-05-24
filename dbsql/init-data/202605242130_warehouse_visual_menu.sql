-- 用途：新增租户端仓库可视化菜单
-- 影响范围：menus、tenant_menu_permissions、role_menus

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
VALUES
  ('tenant:location:visual', 'tenant', '仓库可视化', 'MENU', '/warehouse/visual', NULL, 'IconMapPin', 5, 0, 1, 0, '二维库位地图与库存定位')
ON DUPLICATE KEY UPDATE
  `scope` = VALUES(`scope`),
  `name` = VALUES(`name`),
  `type` = VALUES(`type`),
  `routePath` = VALUES(`routePath`),
  `componentPath` = VALUES(`componentPath`),
  `icon` = VALUES(`icon`),
  `sortOrder` = VALUES(`sortOrder`),
  `isHidden` = VALUES(`isHidden`),
  `isActive` = VALUES(`isActive`),
  `description` = VALUES(`description`);

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:warehouse'
SET child.`parentId` = parent.`id`
WHERE child.`code` = 'tenant:location:visual';

UPDATE `menus`
SET `sortOrder` = 10
WHERE `code` = 'tenant:location:list';

INSERT IGNORE INTO `tenant_menu_permissions` (`tenantId`, `menuId`)
SELECT t.`id`, m.`id`
FROM `tenants` t
JOIN `menus` m ON m.`code` = 'tenant:location:visual';

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT r.`id`, m.`id`
FROM `roles` r
JOIN `menus` m ON m.`code` = 'tenant:location:visual'
WHERE r.`scope` = 'tenant'
  AND r.`code` = 'ADMIN';
