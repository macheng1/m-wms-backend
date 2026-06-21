-- 用途：小程序产品订购单与库存锁定联动
-- 影响范围：orders、inventory、inventory_transactions

SET @schema_name = DATABASE();

ALTER TABLE `orders`
  MODIFY COLUMN `status` enum(
    'PENDING_CONFIRM',
    'PENDING_REVIEW',
    'REJECTED',
    'CONFIRMED',
    'PROCESSING',
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

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `customerAddress` varchar(255) NULL AFTER `customerEmail`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'customerAddress');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD COLUMN `miniappMemberId` char(36) NULL AFTER `customerAddress`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'orders' AND column_name = 'miniappMemberId');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `orders` ADD INDEX `IDX_orders_miniapp_member` (`miniappMemberId`, `source`, `createdAt`)', 'SELECT 1') FROM information_schema.statistics WHERE table_schema = @schema_name AND table_name = 'orders' AND index_name = 'IDX_orders_miniapp_member');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0, 'ALTER TABLE `inventory` ADD COLUMN `lockedQuantity` decimal(15,2) NOT NULL DEFAULT 0.00 AFTER `quantity`', 'SELECT 1') FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'inventory' AND column_name = 'lockedQuantity');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE `inventory_transactions`
  MODIFY COLUMN `transactionType` enum(
    'INBOUND_PURCHASE',
    'INBOUND_RETURN',
    'INBOUND_TRANSFER',
    'INBOUND_PRODUCTION',
    'OUTBOUND_SALES',
    'OUTBOUND_MATERIAL',
    'OUTBOUND_TRANSFER',
    'OUTBOUND_SCRAP',
    'STOCK_LOCK',
    'STOCK_RELEASE',
    'ADJUSTMENT_IN',
    'ADJUSTMENT_OUT'
  ) NOT NULL;

ALTER TABLE `order_flow_logs`
  MODIFY COLUMN `fromStatus` varchar(40) NULL,
  MODIFY COLUMN `toStatus` varchar(40) NOT NULL;

UPDATE `menus`
SET `name` = CASE `code`
  WHEN 'tenant:order' THEN '订购管理'
  WHEN 'tenant:order:list' THEN '订购列表'
  WHEN 'tenant:order:create' THEN '新增订购单'
  WHEN 'tenant:order:update' THEN '编辑订购单'
  WHEN 'tenant:order:delete' THEN '删除订购单'
  WHEN 'tenant:order:flow' THEN '订购单流转'
  ELSE `name`
END
WHERE `code` IN (
  'tenant:order',
  'tenant:order:list',
  'tenant:order:create',
  'tenant:order:update',
  'tenant:order:delete',
  'tenant:order:flow'
);
