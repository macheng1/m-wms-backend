-- 用途：补齐产品描述字段；平台模板复用现有 categories/attributes/units 的 tenantId = NULL 数据。
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'description') = 0,
  "ALTER TABLE `products` ADD COLUMN `description` text DEFAULT NULL COMMENT '产品描述' AFTER `unit`",
  "SELECT 'skip products.description'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
