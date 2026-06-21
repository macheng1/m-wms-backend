-- 用途：新增库位亮灯任务表
-- 影响范围：location_light_tasks

CREATE TABLE IF NOT EXISTS `location_light_tasks` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `locationId` char(36) NOT NULL,
  `locationCode` varchar(50) NOT NULL,
  `deviceCode` varchar(50) DEFAULT NULL,
  `deviceUrl` varchar(255) DEFAULT NULL,
  `ledIndex` int DEFAULT NULL,
  `action` enum('ON','OFF') NOT NULL,
  `status` enum('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
  `duration` int NOT NULL DEFAULT 60,
  `color` varchar(30) NOT NULL DEFAULT 'yellow',
  `payload` json DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `executedAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `location_light_task_tenant_location_idx` (`tenantId`, `locationId`),
  KEY `location_light_task_status_idx` (`status`),
  CONSTRAINT `FK_location_light_tasks_location`
    FOREIGN KEY (`locationId`) REFERENCES `locations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
