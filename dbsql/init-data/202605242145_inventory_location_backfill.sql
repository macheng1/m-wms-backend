-- 用途：将已有库存汇总表中的库位库存回填到库位明细表
-- 影响范围：inventory_locations
-- 说明：后续入库、出库、库存调整会实时维护 inventory_locations。

INSERT INTO `inventory_locations` (
  `id`,
  `tenantId`,
  `sku`,
  `productName`,
  `locationId`,
  `quantity`,
  `unitId`,
  `lockedQuantity`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  i.`tenantId`,
  i.`sku`,
  i.`productName`,
  i.`locationId`,
  i.`quantity`,
  i.`unitId`,
  0,
  NOW(6),
  NOW(6)
FROM `inventory` i
WHERE i.`locationId` IS NOT NULL
  AND i.`quantity` > 0
  AND NOT EXISTS (
    SELECT 1
    FROM `inventory_locations` il
    WHERE il.`tenantId` = i.`tenantId`
      AND il.`sku` = i.`sku`
      AND il.`locationId` = i.`locationId`
  );

UPDATE `locations` l
SET l.`status` = 'OCCUPIED'
WHERE l.`status` <> 'DISABLED'
  AND EXISTS (
    SELECT 1
    FROM `inventory_locations` il
    WHERE il.`tenantId` = l.`tenantId`
      AND il.`locationId` = l.`id`
      AND il.`quantity` > 0
  );

UPDATE `locations` l
SET l.`status` = 'AVAILABLE'
WHERE l.`status` = 'OCCUPIED'
  AND NOT EXISTS (
    SELECT 1
    FROM `inventory_locations` il
    WHERE il.`tenantId` = l.`tenantId`
      AND il.`locationId` = l.`id`
      AND il.`quantity` > 0
  );
