-- 用途：升级订单为多入口、多类型、可流转订单模型
-- 影响范围：orders、order_items、order_flow_logs、menus、tenant_menu_permissions、role_menus

ALTER TABLE `orders`
  MODIFY COLUMN `status` enum(
    'PENDING_CONFIRM',
    'PENDING_REVIEW',
    'REJECTED',
    'CONFIRMED',
    'STOCK_LOCKED',
    'OUT_OF_STOCK',
    'PENDING_SCHEDULE',
    'SCHEDULED',
    'PRODUCING',
    'PRODUCED',
    'PENDING_SHIPMENT',
    'SHIPPED',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING_CONFIRM';

SET @schema_name = DATABASE();

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `source` enum(''MINIAPP'',''WEBSITE'',''ADMIN'') NOT NULL DEFAULT ''ADMIN'' AFTER `orderNumber`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'source');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `orderType` enum(''STANDARD'',''CUSTOM'') NOT NULL DEFAULT ''STANDARD'' AFTER `source`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'orderType');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `customerName` varchar(80) NULL AFTER `status`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'customerName');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `customerPhone` varchar(30) NULL AFTER `customerName`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'customerPhone');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `customerEmail` varchar(120) NULL AFTER `customerPhone`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'customerEmail');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `remark` text NULL AFTER `totalAmount`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'remark');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `reviewRemark` text NULL AFTER `remark`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'reviewRemark');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `rejectReason` text NULL AFTER `reviewRemark`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'rejectReason');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `expectedDeliveryDate` datetime NULL AFTER `rejectReason`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'expectedDeliveryDate');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `scheduledStartDate` datetime NULL AFTER `expectedDeliveryDate`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'scheduledStartDate');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `scheduledEndDate` datetime NULL AFTER `scheduledStartDate`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'scheduledEndDate');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `producedAt` datetime NULL AFTER `scheduledEndDate`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'producedAt');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `shippedAt` datetime NULL AFTER `producedAt`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'shippedAt');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `completedAt` datetime NULL AFTER `shippedAt`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'completedAt');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `cancelledAt` datetime NULL AFTER `completedAt`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'cancelledAt');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `orders`
SET `status` = CASE `status`
  WHEN 'pending' THEN 'PENDING_CONFIRM'
  WHEN 'processing' THEN 'CONFIRMED'
  WHEN 'completed' THEN 'COMPLETED'
  WHEN 'cancelled' THEN 'CANCELLED'
  ELSE `status`
END;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `orderId` char(36) NOT NULL,
  `productId` char(36) DEFAULT NULL,
  `sku` varchar(80) DEFAULT NULL,
  `productName` varchar(120) NOT NULL,
  `quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unitCode` varchar(30) DEFAULT NULL,
  `unitName` varchar(30) DEFAULT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `specs` json DEFAULT NULL,
  `customRequirement` text DEFAULT NULL,
  `drawingUrls` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_order_items_tenant_order` (`tenantId`, `orderId`),
  CONSTRAINT `FK_order_items_order` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_flow_logs` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `orderId` char(36) NOT NULL,
  `fromStatus` varchar(40) DEFAULT NULL,
  `toStatus` varchar(40) NOT NULL,
  `action` varchar(50) NOT NULL,
  `operatorId` char(36) DEFAULT NULL,
  `operatorName` varchar(80) DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_order_flow_logs_tenant_order` (`tenantId`, `orderId`),
  CONSTRAINT `FK_order_flow_logs_order` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'tenant:order', 'tenant', '订单管理', 'DIRECTORY', '/orders', NULL, 'IconList', 45, 0, 1, 0, '订单管理'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'tenant:order');
INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'tenant:order:list', 'tenant', '订单列表', 'MENU', '/orders', NULL, NULL, 10, 0, 1, 0, '订单列表'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'tenant:order:list');
INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'tenant:order:create', 'tenant', '新增订单', 'BUTTON', NULL, NULL, NULL, 10, 1, 1, 0, '新增订单'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'tenant:order:create');
INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'tenant:order:update', 'tenant', '编辑订单', 'BUTTON', NULL, NULL, NULL, 20, 1, 1, 0, '编辑订单'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'tenant:order:update');
INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'tenant:order:delete', 'tenant', '删除订单', 'BUTTON', NULL, NULL, NULL, 30, 1, 1, 0, '删除订单'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'tenant:order:delete');
INSERT INTO `menus` (`code`, `scope`, `name`, `type`, `routePath`, `componentPath`, `icon`, `sortOrder`, `isHidden`, `isActive`, `parentId`, `description`)
SELECT 'tenant:order:flow', 'tenant', '订单流转', 'BUTTON', NULL, NULL, NULL, 40, 1, 1, 0, '订单流转'
WHERE NOT EXISTS (SELECT 1 FROM `menus` WHERE `code` = 'tenant:order:flow');

UPDATE `menus`
SET `scope` = 'tenant',
    `name` = CASE `code`
      WHEN 'tenant:order' THEN '订单管理'
      WHEN 'tenant:order:list' THEN '订单列表'
      WHEN 'tenant:order:create' THEN '新增订单'
      WHEN 'tenant:order:update' THEN '编辑订单'
      WHEN 'tenant:order:delete' THEN '删除订单'
      WHEN 'tenant:order:flow' THEN '订单流转'
      ELSE `name`
    END,
    `type` = CASE `code`
      WHEN 'tenant:order' THEN 'DIRECTORY'
      WHEN 'tenant:order:list' THEN 'MENU'
      ELSE 'BUTTON'
    END,
    `routePath` = CASE `code`
      WHEN 'tenant:order' THEN '/orders'
      WHEN 'tenant:order:list' THEN '/orders'
      ELSE NULL
    END,
    `icon` = CASE `code` WHEN 'tenant:order' THEN 'IconList' ELSE NULL END,
    `isHidden` = CASE `code` WHEN 'tenant:order:create' THEN 1 WHEN 'tenant:order:update' THEN 1 WHEN 'tenant:order:delete' THEN 1 WHEN 'tenant:order:flow' THEN 1 ELSE 0 END,
    `isActive` = 1
WHERE `code` IN (
  'tenant:order',
  'tenant:order:list',
  'tenant:order:create',
  'tenant:order:update',
  'tenant:order:delete',
  'tenant:order:flow'
);

CREATE TEMPORARY TABLE IF NOT EXISTS `tmp_order_menu_dedup` AS
SELECT m.`id` AS `duplicateId`, keepers.`keepId`
FROM `menus` m
JOIN (
  SELECT `code`, MIN(`id`) AS `keepId`
  FROM `menus`
  WHERE `code` LIKE 'tenant:order%'
  GROUP BY `code`
  HAVING COUNT(*) > 1
) keepers ON keepers.`code` = m.`code`
WHERE m.`id` <> keepers.`keepId`;

UPDATE IGNORE `role_menus` rm
JOIN `tmp_order_menu_dedup` d ON d.`duplicateId` = rm.`menuId`
SET rm.`menuId` = d.`keepId`;
UPDATE IGNORE `tenant_menu_permissions` tmp
JOIN `tmp_order_menu_dedup` d ON d.`duplicateId` = tmp.`menuId`
SET tmp.`menuId` = d.`keepId`;
DELETE rm FROM `role_menus` rm JOIN `tmp_order_menu_dedup` d ON d.`duplicateId` = rm.`menuId`;
DELETE tmp FROM `tenant_menu_permissions` tmp JOIN `tmp_order_menu_dedup` d ON d.`duplicateId` = tmp.`menuId`;
DELETE m FROM `menus` m JOIN `tmp_order_menu_dedup` d ON d.`duplicateId` = m.`id`;

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:order'
SET child.`parentId` = parent.`id`
WHERE child.`code` = 'tenant:order:list';

UPDATE `menus` child
JOIN `menus` parent ON parent.`code` = 'tenant:order:list'
SET child.`parentId` = parent.`id`
WHERE child.`code` IN (
  'tenant:order:create',
  'tenant:order:update',
  'tenant:order:delete',
  'tenant:order:flow'
);

INSERT IGNORE INTO `tenant_menu_permissions` (`tenantId`, `menuId`)
SELECT t.`id`, m.`id`
FROM `tenants` t
JOIN `menus` m ON m.`code` IN (
  'tenant:order',
  'tenant:order:list',
  'tenant:order:create',
  'tenant:order:update',
  'tenant:order:delete',
  'tenant:order:flow'
);

INSERT IGNORE INTO `role_menus` (`roleId`, `menuId`)
SELECT r.`id`, m.`id`
FROM `roles` r
JOIN `menus` m ON m.`scope` = 'tenant'
WHERE r.`scope` = 'tenant'
  AND r.`code` = 'ADMIN'
  AND m.`code` IN (
    'tenant:order',
    'tenant:order:list',
    'tenant:order:create',
    'tenant:order:update',
    'tenant:order:delete',
    'tenant:order:flow'
  );
