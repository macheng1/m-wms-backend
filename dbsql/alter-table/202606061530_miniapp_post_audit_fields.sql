-- 小程序信息审核字段补齐
-- 用途：记录审核人，配合 operation_logs 形成审核追踪闭环。
-- 说明：使用 information_schema 做幂等保护，避免重复执行时报错。

SET @schema_name = DATABASE();

SET @has_audited_by_id = (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'miniapp_posts'
    AND COLUMN_NAME = 'auditedById'
);

SET @sql = IF(
  @has_audited_by_id = 0,
  'ALTER TABLE `miniapp_posts` ADD COLUMN `auditedById` char(36) NULL COMMENT ''审核人ID'' AFTER `auditRemark`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_audited_by_name = (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'miniapp_posts'
    AND COLUMN_NAME = 'auditedByName'
);

SET @sql = IF(
  @has_audited_by_name = 0,
  'ALTER TABLE `miniapp_posts` ADD COLUMN `auditedByName` varchar(100) NULL COMMENT ''审核人名称'' AFTER `auditedById`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_audited_by_index = (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema_name
    AND TABLE_NAME = 'miniapp_posts'
    AND INDEX_NAME = 'IDX_miniapp_post_audited_by'
);

SET @sql = IF(
  @has_audited_by_index = 0,
  'CREATE INDEX `IDX_miniapp_post_audited_by` ON `miniapp_posts` (`auditedById`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
