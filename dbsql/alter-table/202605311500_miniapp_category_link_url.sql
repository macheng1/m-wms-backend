-- 用途：小程序分类增加点击跳转 URL
-- 影响范围：miniapp_categories
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'miniapp_categories' AND COLUMN_NAME = 'linkUrl') = 0,
  "ALTER TABLE `miniapp_categories` ADD COLUMN `linkUrl` text DEFAULT NULL COMMENT '点击跳转 URL' AFTER `iconUrl`",
  "SELECT 'skip miniapp_categories.linkUrl'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
