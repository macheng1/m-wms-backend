-- 用途：新增货位灯菜单权限
-- 影响范围：menus、tenant_menu_permissions、role_menus

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'tenant:ptl', 'tenant', '货位灯', 'MENU', '/warehouse/ptl', NULL, 'IconBolt', 15, 0, 1, 0, '货位灯找货、控制器与库位灯绑定'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'tenant:ptl');

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT menu_item.`code`, 'tenant', menu_item.`name`, 'BUTTON', NULL, NULL, NULL, menu_item.`sortOrder`, 0, 1, 0, menu_item.`description`
FROM (
  SELECT 'tenant:ptl:controller' AS `code`, '货位灯控制器管理' AS `name`, 10 AS `sortOrder`, '新增、编辑、删除 PTL 控制器' AS `description`
  UNION ALL
  SELECT 'tenant:ptl:binding', '货位灯绑定管理', 20, '新增、编辑、删除、校准库位灯绑定'
  UNION ALL
  SELECT 'tenant:ptl:task', '货位灯找货任务', 30, '按 SKU 点灯、灭灯、确认找货任务'
) menu_item
WHERE NOT EXISTS (SELECT 1 FROM `menus` existing WHERE existing.`code` = menu_item.`code`);

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:warehouse'
SET child.`parentId` = parent.`id`,
    child.`type` = 'MENU',
    child.`routePath` = '/warehouse/ptl',
    child.`sortOrder` = 15,
    child.`isActive` = 1,
    child.`isHidden` = 0
WHERE child.`code` = 'tenant:ptl';

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:ptl'
SET child.`parentId` = parent.`id`,
    child.`type` = 'BUTTON',
    child.`isActive` = 1,
    child.`isHidden` = 0
WHERE child.`code` IN ('tenant:ptl:controller', 'tenant:ptl:binding', 'tenant:ptl:task');

INSERT IGNORE INTO `tenant_menu_permissions` (`tenantId`, `menuId`)
SELECT t.`id`, m.`id`
FROM `tenants` t
JOIN `menus` m ON m.`code` IN (
  'tenant:ptl',
  'tenant:ptl:controller',
  'tenant:ptl:binding',
  'tenant:ptl:task'
)
WHERE m.`scope` = 'tenant';

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT r.`id`, m.`id`
FROM `roles` r
JOIN `menus` m ON m.`code` IN (
  'tenant:ptl',
  'tenant:ptl:controller',
  'tenant:ptl:binding',
  'tenant:ptl:task'
)
WHERE r.`scope` = 'tenant'
  AND (r.`code` IN ('ADMIN', 'WH_MANAGER') OR r.`name` IN ('系统管理员', '仓库主管'));
