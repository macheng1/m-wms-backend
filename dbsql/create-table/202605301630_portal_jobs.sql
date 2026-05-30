-- 官网招聘职位
CREATE TABLE IF NOT EXISTS `portal_jobs` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `position` varchar(100) NOT NULL COMMENT '招聘职位',
  `count` int NOT NULL DEFAULT 1 COMMENT '招聘人数',
  `salary` varchar(100) DEFAULT NULL COMMENT '薪资范围',
  `location` varchar(100) DEFAULT NULL COMMENT '工作地点',
  `experience` varchar(100) DEFAULT NULL COMMENT '经验要求',
  `education` varchar(100) DEFAULT NULL COMMENT '学历要求',
  `description` text DEFAULT NULL COMMENT '职位描述',
  `requirement` text DEFAULT NULL COMMENT '任职要求',
  `sortOrder` int NOT NULL DEFAULT 0 COMMENT '排序',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1发布，0下架',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  PRIMARY KEY (`id`),
  KEY `IDX_portal_jobs_tenant_sort` (`tenantId`, `sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官网招聘职位';
