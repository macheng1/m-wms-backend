-- 用途：初始化平台默认部门和岗位数据
-- 来源需求：平台端需要基础组织数据，租户端后续可按模板复制或自行维护
-- 影响范围：departments、posts
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB
-- 说明：本脚本只初始化平台级数据，tenantId 固定为 NULL；使用固定 ID 幂等写入。
-- 前置条件：空库需先执行 dbsql/init/init-schema.sql；旧库需先执行 dbsql/create-table/202605231100_department_post_update.sql。

INSERT INTO `departments` (
  `id`,
  `tenantId`,
  `parentId`,
  `deptCode`,
  `deptName`,
  `orderNum`,
  `leader`,
  `phone`,
  `email`,
  `isActive`
)
VALUES
  ('00000000-0000-0000-0200-000000000001', NULL, NULL, 'PLATFORM', '平台总部', 10, NULL, NULL, NULL, 1),
  ('00000000-0000-0000-0200-000000000002', NULL, '00000000-0000-0000-0200-000000000001', 'PLATFORM_PRODUCT', '产品部', 20, NULL, NULL, NULL, 1),
  ('00000000-0000-0000-0200-000000000003', NULL, '00000000-0000-0000-0200-000000000001', 'PLATFORM_TECH', '技术部', 30, NULL, NULL, NULL, 1),
  ('00000000-0000-0000-0200-000000000004', NULL, '00000000-0000-0000-0200-000000000001', 'PLATFORM_OPERATION', '运营部', 40, NULL, NULL, NULL, 1),
  ('00000000-0000-0000-0200-000000000005', NULL, '00000000-0000-0000-0200-000000000001', 'PLATFORM_CUSTOMER_SUCCESS', '客户成功部', 50, NULL, NULL, NULL, 1),
  ('00000000-0000-0000-0200-000000000006', NULL, '00000000-0000-0000-0200-000000000001', 'PLATFORM_FINANCE', '财务部', 60, NULL, NULL, NULL, 1)
ON DUPLICATE KEY UPDATE
  `tenantId` = VALUES(`tenantId`),
  `parentId` = VALUES(`parentId`),
  `deptName` = VALUES(`deptName`),
  `orderNum` = VALUES(`orderNum`),
  `leader` = VALUES(`leader`),
  `phone` = VALUES(`phone`),
  `email` = VALUES(`email`),
  `isActive` = VALUES(`isActive`);

INSERT INTO `posts` (
  `id`,
  `tenantId`,
  `postCode`,
  `postName`,
  `postSort`,
  `isActive`,
  `remark`
)
VALUES
  ('00000000-0000-0000-0201-000000000001', NULL, 'PLATFORM_ADMIN', '平台管理员', 10, 1, '平台系统管理岗位'),
  ('00000000-0000-0000-0201-000000000002', NULL, 'PRODUCT_MANAGER', '产品经理', 20, 1, '负责需求、PRD、版本规划'),
  ('00000000-0000-0000-0201-000000000003', NULL, 'TECH_ENGINEER', '技术工程师', 30, 1, '负责系统研发、接口和数据结构维护'),
  ('00000000-0000-0000-0201-000000000004', NULL, 'OPERATION_SPECIALIST', '运营专员', 40, 1, '负责租户运营、资料维护和日常配置'),
  ('00000000-0000-0000-0201-000000000005', NULL, 'CUSTOMER_SUCCESS', '客户成功', 50, 1, '负责租户服务、培训和问题跟进'),
  ('00000000-0000-0000-0201-000000000006', NULL, 'FINANCE_SPECIALIST', '财务专员', 60, 1, '负责合同、账务和开票协同'),
  ('00000000-0000-0000-0201-000000000007', NULL, 'AUDITOR', '审核员', 70, 1, '负责租户入驻审核和资料核验')
ON DUPLICATE KEY UPDATE
  `tenantId` = VALUES(`tenantId`),
  `postName` = VALUES(`postName`),
  `postSort` = VALUES(`postSort`),
  `isActive` = VALUES(`isActive`),
  `remark` = VALUES(`remark`);
