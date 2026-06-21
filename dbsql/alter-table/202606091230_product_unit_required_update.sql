-- 用途：产品绑定库存主单位，并同步旧产品单位数据
-- 影响范围：products、inventory、inventory_locations、units

SET @schema_name = DATABASE();

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `products` ADD COLUMN `unitId` char(36) NULL COMMENT ''库存主单位ID'' AFTER `categoryId`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'products' AND column_name = 'unitId');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO `units` (`id`, `createdAt`, `updatedAt`, `tenantId`, `name`, `code`, `category`, `baseRatio`, `baseUnitCode`, `symbol`, `description`, `isActive`, `sortOrder`)
SELECT UUID(), NOW(6), NOW(6), p.`tenantId`, '支', 'ZHI', 'COUNT', 1.00, 'PCS', '支', '旧产品单位“支”自动同步', 1, 0
FROM (
  SELECT DISTINCT `tenantId`
  FROM `products`
  WHERE `tenantId` IS NOT NULL AND `unit` = '支'
) p
WHERE NOT EXISTS (
  SELECT 1 FROM `units` u WHERE u.`tenantId` = p.`tenantId` AND u.`code` = 'ZHI'
);

INSERT INTO `units` (`id`, `createdAt`, `updatedAt`, `tenantId`, `name`, `code`, `category`, `baseRatio`, `baseUnitCode`, `symbol`, `description`, `isActive`, `sortOrder`)
SELECT UUID(), NOW(6), NOW(6), NULL, '支', 'ZHI', 'COUNT', 1.00, 'PCS', '支', '旧产品单位“支”自动同步', 1, 0
WHERE EXISTS (SELECT 1 FROM `products` WHERE `tenantId` IS NULL AND `unit` = '支')
  AND NOT EXISTS (SELECT 1 FROM `units` WHERE `tenantId` IS NULL AND `code` = 'ZHI');

UPDATE `products` p
JOIN (
  SELECT `tenantId`, `sku`, MIN(`unitId`) AS `unitId`
  FROM `inventory`
  WHERE `unitId` IS NOT NULL
  GROUP BY `tenantId`, `sku`
) i ON i.`tenantId` = p.`tenantId` AND i.`sku` = p.`code`
SET p.`unitId` = i.`unitId`
WHERE p.`unitId` IS NULL;

UPDATE `products` p
JOIN (
  SELECT p2.`id` AS `productId`, MIN(u.`id`) AS `unitId`
  FROM `products` p2
  JOIN `units` u
    ON u.`tenantId` = p2.`tenantId`
   AND (u.`code` = p2.`unit` OR u.`name` = p2.`unit` OR u.`symbol` = p2.`unit`)
  WHERE p2.`unitId` IS NULL AND p2.`unit` IS NOT NULL AND p2.`unit` <> ''
  GROUP BY p2.`id`
) m ON m.`productId` = p.`id`
SET p.`unitId` = m.`unitId`
WHERE p.`unitId` IS NULL;

UPDATE `products` p
JOIN (
  SELECT p2.`id` AS `productId`, MIN(u.`id`) AS `unitId`
  FROM `products` p2
  JOIN `units` u
    ON u.`tenantId` IS NULL
   AND (u.`code` = p2.`unit` OR u.`name` = p2.`unit` OR u.`symbol` = p2.`unit`)
  WHERE p2.`unitId` IS NULL AND p2.`unit` IS NOT NULL AND p2.`unit` <> ''
  GROUP BY p2.`id`
) m ON m.`productId` = p.`id`
SET p.`unitId` = m.`unitId`
WHERE p.`unitId` IS NULL;

UPDATE `products` p
JOIN `units` u ON u.`tenantId` IS NULL AND u.`code` = 'PCS'
SET p.`unitId` = u.`id`
WHERE p.`unitId` IS NULL;

UPDATE `products` p
JOIN `units` u ON u.`id` = p.`unitId`
SET p.`unit` = COALESCE(u.`symbol`, u.`name`, u.`code`);

UPDATE `inventory` i
JOIN `products` p ON p.`tenantId` = i.`tenantId` AND p.`code` = i.`sku`
SET i.`unitId` = p.`unitId`
WHERE i.`unitId` IS NULL AND p.`unitId` IS NOT NULL;

UPDATE `inventory_locations` il
JOIN `products` p ON p.`tenantId` = il.`tenantId` AND p.`code` = il.`sku`
SET il.`unitId` = p.`unitId`
WHERE il.`unitId` IS NULL AND p.`unitId` IS NOT NULL;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `products` ADD INDEX `IDX_products_unit_id` (`unitId`)', 'SELECT 1') FROM information_schema.statistics WHERE table_schema = @schema_name AND table_name = 'products' AND index_name = 'IDX_products_unit_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `products` ADD CONSTRAINT `FK_products_unit` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1') FROM information_schema.referential_constraints WHERE constraint_schema = @schema_name AND table_name = 'products' AND constraint_name = 'FK_products_unit');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE `products`
  MODIFY COLUMN `unitId` char(36) NOT NULL COMMENT '库存主单位ID';
