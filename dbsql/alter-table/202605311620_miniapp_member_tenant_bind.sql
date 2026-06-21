ALTER TABLE `miniapp_members`
  ADD COLUMN `tenantId` CHAR(36) NULL COMMENT '绑定租户ID' AFTER `isAuthorization`,
  ADD COLUMN `tenantBindStatus` ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none' COMMENT '企业绑定状态' AFTER `tenantId`,
  ADD COLUMN `tenantRole` VARCHAR(20) NULL COMMENT '企业角色：owner/admin/staff' AFTER `tenantBindStatus`,
  ADD COLUMN `tenantBindRemark` TEXT NULL COMMENT '企业绑定备注/驳回原因' AFTER `tenantRole`,
  ADD INDEX `IDX_miniapp_member_tenant` (`tenantId`),
  ADD INDEX `IDX_miniapp_member_tenant_bind_status` (`tenantBindStatus`);
