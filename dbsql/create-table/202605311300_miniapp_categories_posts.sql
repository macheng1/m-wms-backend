-- 用途：小程序首页分类与发布信息基础表
-- 影响范围：miniapp_categories、miniapp_posts
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

CREATE TABLE IF NOT EXISTS `miniapp_categories` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `name` varchar(80) NOT NULL COMMENT '分类名称',
  `code` varchar(80) NOT NULL COMMENT '分类编码',
  `iconUrl` text DEFAULT NULL COMMENT '分类图标 URL',
  `linkUrl` text DEFAULT NULL COMMENT '点击跳转 URL',
  `description` varchar(200) DEFAULT NULL COMMENT '分类说明',
  `templateFields` json DEFAULT NULL COMMENT '发布字段模板 JSON',
  `sortOrder` int NOT NULL DEFAULT 0 COMMENT '排序，越小越靠前',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_miniapp_category_code` (`code`),
  KEY `IDX_miniapp_category_sort` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `miniapp_posts` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `categoryId` char(36) NOT NULL COMMENT '小程序分类ID',
  `memberId` char(36) DEFAULT NULL COMMENT '发布会员ID',
  `tenantId` char(36) DEFAULT NULL COMMENT '企业租户ID',
  `title` varchar(120) DEFAULT NULL COMMENT '标题',
  `phone` varchar(30) DEFAULT NULL COMMENT '联系电话',
  `content` text NOT NULL COMMENT '发布内容',
  `structuredData` json DEFAULT NULL COMMENT '结构化发布字段 JSON',
  `region` varchar(120) DEFAULT NULL COMMENT '地区',
  `imgList` text DEFAULT NULL COMMENT '图片/图纸 URL，逗号分隔',
  `viewNum` int NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `status` enum('pending','published','rejected','offline') NOT NULL DEFAULT 'pending' COMMENT '状态：pending待审核/published已发布/rejected已驳回/offline已下架',
  `auditRemark` text DEFAULT NULL COMMENT '审核/驳回原因',
  `auditedById` char(36) DEFAULT NULL COMMENT '审核人ID',
  `auditedByName` varchar(100) DEFAULT NULL COMMENT '审核人名称',
  `auditedAt` datetime DEFAULT NULL COMMENT '审核时间',
  PRIMARY KEY (`id`),
  KEY `IDX_miniapp_post_category` (`categoryId`),
  KEY `IDX_miniapp_post_status_created` (`status`,`createdAt`),
  KEY `IDX_miniapp_post_region` (`region`),
  KEY `IDX_miniapp_post_audited_by` (`auditedById`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `miniapp_categories` (`id`, `name`, `code`, `iconUrl`, `description`, `sortOrder`, `isActive`)
SELECT UUID(), seed.`name`, seed.`code`, seed.`iconUrl`, seed.`description`, seed.`sortOrder`, 1
FROM (
  SELECT '找工厂/找加工' AS `name`, 'factory_processing' AS `code`, 'icon-factory' AS `iconUrl`, 'CNC、钣金、注塑、模具、焊接、表面处理、组装、包装、设备维修' AS `description`, 10 AS `sortOrder`
  UNION ALL SELECT '订单外发', 'outsourcing_order', 'icon-order', '发布加工需求、上传图纸图片、填写材质数量交期地区预算，工厂联系报价', 20
  UNION ALL SELECT '产能发布', 'capacity', 'icon-capacity', '发布空闲产能、设备类型、可加工范围、最小起订量、急单、地区', 30
  UNION ALL SELECT '材料/配件供应', 'materials_parts', 'icon-material', '原材料、标准件、五金件、电子元件、包材、辅料', 40
  UNION ALL SELECT '设备买卖/租赁', 'equipment_trade_rent', 'icon-equipment', '二手机床、生产设备、检测设备、叉车/仓储设备、设备租赁', 50
  UNION ALL SELECT '招工/找活', 'jobs_work', 'icon-job', '普工、焊工、CNC操机、质检、维修工、临时工、班组承包', 60
) seed
WHERE NOT EXISTS (
  SELECT 1 FROM `miniapp_categories` existing WHERE existing.`code` = seed.`code`
);
