-- 用途：小程序首页轮播图管理
-- 影响范围：miniapp_banners
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

CREATE TABLE IF NOT EXISTS `miniapp_banners` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `title` varchar(100) NOT NULL COMMENT '轮播图标题',
  `imageUrl` text NOT NULL COMMENT '图片 URL',
  `linkType` enum('none','page','webview','post','category') NOT NULL DEFAULT 'none' COMMENT '跳转类型：none不跳转/page小程序页面/webview网页/post信息详情/category分类',
  `linkValue` text DEFAULT NULL COMMENT '跳转地址或目标ID',
  `sortOrder` int NOT NULL DEFAULT 0 COMMENT '排序，越小越靠前',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1启用，0停用',
  PRIMARY KEY (`id`),
  KEY `IDX_miniapp_banner_sort` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `miniapp_banners` (`id`, `title`, `imageUrl`, `linkType`, `linkValue`, `sortOrder`, `isActive`)
SELECT UUID(), '制造业供需平台', 'http://macheng123.oss-cn-hangzhou.aliyuncs.com/image/banner.png', 'none', NULL, 10, 1
WHERE NOT EXISTS (SELECT 1 FROM `miniapp_banners`);
