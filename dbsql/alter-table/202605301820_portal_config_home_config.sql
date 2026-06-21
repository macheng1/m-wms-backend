ALTER TABLE `portal_configs`
  ADD COLUMN `homeConfig` json DEFAULT NULL COMMENT '首页模块配置' AFTER `seoConfig`;
