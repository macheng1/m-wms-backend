-- 小程序信息审核字段补齐
-- 用途：记录审核人，配合 operation_logs 形成审核追踪闭环。

ALTER TABLE `miniapp_posts`
  ADD COLUMN `auditedById` char(36) NULL COMMENT '审核人ID' AFTER `auditRemark`,
  ADD COLUMN `auditedByName` varchar(100) NULL COMMENT '审核人名称' AFTER `auditedById`;

CREATE INDEX `IDX_miniapp_post_audited_by` ON `miniapp_posts` (`auditedById`);
