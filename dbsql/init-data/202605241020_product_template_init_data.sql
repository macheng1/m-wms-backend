-- 用途：初始化平台产品基础模板（tenantId = NULL）
-- 影响范围：units、attributes、attribute_options、categories、category_attributes

INSERT INTO `units` (`id`, `tenantId`, `name`, `code`, `category`, `baseRatio`, `baseUnitCode`, `symbol`, `description`, `isActive`, `sortOrder`)
VALUES
  ('00000000-0000-0000-0201-000000000001', NULL, '个', 'PCS', 'COUNT', 1.00, 'PCS', '个', '通用计数单位', 1, 10),
  ('00000000-0000-0000-0201-000000000002', NULL, '件', 'PIECE', 'COUNT', 1.00, 'PIECE', '件', '通用计数单位', 1, 20),
  ('00000000-0000-0000-0201-000000000003', NULL, '箱', 'BOX', 'COUNT', 1.00, 'PCS', '箱', '包装单位', 1, 30),
  ('00000000-0000-0000-0201-000000000004', NULL, '千克', 'KG', 'WEIGHT', 1000.00, 'G', 'kg', '重量单位', 1, 10),
  ('00000000-0000-0000-0201-000000000005', NULL, '克', 'G', 'WEIGHT', 1.00, 'G', 'g', '重量基准单位', 1, 20),
  ('00000000-0000-0000-0201-000000000006', NULL, '米', 'M', 'LENGTH', 1000.00, 'MM', 'm', '长度单位', 1, 10),
  ('00000000-0000-0000-0201-000000000007', NULL, '毫米', 'MM', 'LENGTH', 1.00, 'MM', 'mm', '长度基准单位', 1, 20)
ON DUPLICATE KEY UPDATE
  `tenantId` = VALUES(`tenantId`),
  `name` = VALUES(`name`),
  `category` = VALUES(`category`),
  `baseRatio` = VALUES(`baseRatio`),
  `baseUnitCode` = VALUES(`baseUnitCode`),
  `symbol` = VALUES(`symbol`),
  `description` = VALUES(`description`),
  `isActive` = VALUES(`isActive`),
  `sortOrder` = VALUES(`sortOrder`);

INSERT INTO `attributes` (`id`, `tenantId`, `name`, `code`, `type`, `unit`, `isActive`)
VALUES
  ('00000000-0000-0000-0202-000000000001', NULL, '材质', 'ATTR_MATERIAL', 'select', NULL, 1),
  ('00000000-0000-0000-0202-000000000002', NULL, '规格', 'ATTR_SPEC', 'input', NULL, 1),
  ('00000000-0000-0000-0202-000000000003', NULL, '型号', 'ATTR_MODEL', 'input', NULL, 1),
  ('00000000-0000-0000-0202-000000000004', NULL, '长度', 'ATTR_LENGTH', 'number', 'mm', 1)
ON DUPLICATE KEY UPDATE
  `tenantId` = VALUES(`tenantId`),
  `name` = VALUES(`name`),
  `type` = VALUES(`type`),
  `unit` = VALUES(`unit`),
  `isActive` = VALUES(`isActive`);

INSERT INTO `attribute_options` (`id`, `tenantId`, `attributeId`, `value`, `isActive`, `sort`)
VALUES
  ('00000000-0000-0000-0203-000000000001', NULL, '00000000-0000-0000-0202-000000000001', '不锈钢', 1, 10),
  ('00000000-0000-0000-0203-000000000002', NULL, '00000000-0000-0000-0202-000000000001', '碳钢', 1, 20),
  ('00000000-0000-0000-0203-000000000003', NULL, '00000000-0000-0000-0202-000000000001', '铝合金', 1, 30),
  ('00000000-0000-0000-0203-000000000004', NULL, '00000000-0000-0000-0202-000000000001', '塑料', 1, 40)
ON DUPLICATE KEY UPDATE
  `tenantId` = VALUES(`tenantId`),
  `attributeId` = VALUES(`attributeId`),
  `value` = VALUES(`value`),
  `isActive` = VALUES(`isActive`),
  `sort` = VALUES(`sort`);

INSERT INTO `categories` (`id`, `tenantId`, `name`, `code`, `isActive`)
VALUES
  ('00000000-0000-0000-0204-000000000001', NULL, '通用产品', 'CAT_GENERAL', 1)
ON DUPLICATE KEY UPDATE
  `tenantId` = VALUES(`tenantId`),
  `name` = VALUES(`name`),
  `isActive` = VALUES(`isActive`);

INSERT IGNORE INTO `category_attributes` (`categoriesId`, `attributesId`)
VALUES
  ('00000000-0000-0000-0204-000000000001', '00000000-0000-0000-0202-000000000001'),
  ('00000000-0000-0000-0204-000000000001', '00000000-0000-0000-0202-000000000002'),
  ('00000000-0000-0000-0204-000000000001', '00000000-0000-0000-0202-000000000003'),
  ('00000000-0000-0000-0204-000000000001', '00000000-0000-0000-0202-000000000004');
