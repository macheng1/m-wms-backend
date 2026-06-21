-- 用途：为租户增加来源字段，区分平台后台、小程序、导入、开放接口创建的企业
-- 影响范围：tenants
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'tenantSource') = 0,
  "ALTER TABLE `tenants` ADD COLUMN `tenantSource` enum('platform','miniapp','import','api') NOT NULL DEFAULT 'platform' COMMENT '租户来源：platform平台后台/miniapp小程序/import导入/api开放接口' AFTER `name`",
  "SELECT 'skip tenants.tenantSource'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND INDEX_NAME = 'IDX_tenants_source') = 0,
  "ALTER TABLE `tenants` ADD INDEX `IDX_tenants_source` (`tenantSource`)",
  "SELECT 'skip IDX_tenants_source'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
