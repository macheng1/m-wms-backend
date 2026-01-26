-- 添加 productName 字段到 inventory_transactions 表
ALTER TABLE inventory_transactions ADD COLUMN productName VARCHAR(200) NOT NULL DEFAULT '' AFTER sku;

-- 为已有数据根据产品表填充 productName（可选）
-- UPDATE inventory_transactions it
-- JOIN products p ON it.sku = p.code AND it.tenantId = p.tenantId
-- SET it.productName = p.name
-- WHERE it.productName = '';
