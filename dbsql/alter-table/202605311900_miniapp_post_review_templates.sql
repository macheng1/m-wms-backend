ALTER TABLE `miniapp_categories`
  ADD COLUMN `templateFields` JSON NULL COMMENT '发布字段模板 JSON' AFTER `description`;

ALTER TABLE `miniapp_posts`
  ADD COLUMN `structuredData` JSON NULL COMMENT '结构化发布字段 JSON' AFTER `content`,
  ADD COLUMN `region` VARCHAR(120) NULL COMMENT '地区' AFTER `structuredData`,
  ADD COLUMN `auditedAt` DATETIME NULL COMMENT '审核时间' AFTER `auditRemark`,
  ADD INDEX `IDX_miniapp_post_region` (`region`);

CREATE TABLE IF NOT EXISTS `miniapp_post_collections` (
  `id` CHAR(36) NOT NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` DATETIME(6) NULL,
  `memberId` CHAR(36) NOT NULL COMMENT '会员ID',
  `postId` CHAR(36) NOT NULL COMMENT '信息ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_miniapp_post_collection_unique` (`memberId`, `postId`),
  KEY `IDX_miniapp_post_collection_post` (`postId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小程序信息收藏';
