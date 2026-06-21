-- 用途：PTL 货位灯找货任务与库位灯绑定（草案，评审通过后执行）
-- 影响范围：devices、ptl_location_bindings、ptl_pick_tasks、ptl_pick_task_items
-- 说明：
-- 1. 复用现有 devices 作为 ESP32 PTL 控制器主数据。
-- 2. location_light_tasks 保留为底层 ON/OFF 指令日志，不承载完整找货闭环。
-- 3. Redis 仅保存活跃任务和库位占用缓存，业务任务主数据落 DB。

ALTER TABLE `devices`
  MODIFY `type` enum(
    'SCANNER',
    'RFID_READER',
    'RFID_TAG',
    'AGV',
    'ESL',
    'SENSOR',
    'PRINTER',
    'GATE',
    'CAMERA',
    'PDA',
    'PTL_CONTROLLER'
  ) NOT NULL;

ALTER TABLE `devices`
  ADD COLUMN `deviceUid` varchar(100) DEFAULT NULL COMMENT '设备唯一标识，如 ESP32 MAC/序列号' AFTER `name`,
  ADD UNIQUE KEY `UQ_devices_device_uid` (`deviceUid`);

CREATE TABLE IF NOT EXISTS `ptl_location_bindings` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `locationId` char(36) NOT NULL,
  `deviceId` char(36) NOT NULL,
  `ledIndex` int NOT NULL,
  `defaultColor` varchar(30) NOT NULL DEFAULT 'blue',
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `remark` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_ptl_binding_tenant_location` (`tenantId`, `locationId`),
  UNIQUE KEY `UQ_ptl_binding_tenant_device_led` (`tenantId`, `deviceId`, `ledIndex`),
  KEY `IDX_ptl_binding_tenant_device` (`tenantId`, `deviceId`),
  CONSTRAINT `FK_ptl_binding_location`
    FOREIGN KEY (`locationId`) REFERENCES `locations` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_ptl_binding_device`
    FOREIGN KEY (`deviceId`) REFERENCES `devices` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ptl_pick_tasks` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `taskNo` varchar(50) DEFAULT NULL,
  `sku` varchar(100) NOT NULL,
  `productName` varchar(200) DEFAULT NULL,
  `status` enum(
    'CREATED',
    'LIGHTING',
    'ACTIVE',
    'PARTIAL_CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'EXPIRED',
    'FAILED'
  ) NOT NULL DEFAULT 'CREATED',
  `source` varchar(30) NOT NULL DEFAULT 'APP',
  `requestedBy` char(36) DEFAULT NULL,
  `totalLocations` int NOT NULL DEFAULT 0,
  `confirmedLocations` int NOT NULL DEFAULT 0,
  `ttlSeconds` int NOT NULL DEFAULT 600,
  `expiresAt` datetime NOT NULL,
  `closedAt` datetime DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_ptl_pick_tasks_task_no` (`tenantId`, `taskNo`),
  KEY `IDX_ptl_pick_tasks_status_expire` (`tenantId`, `status`, `expiresAt`),
  KEY `IDX_ptl_pick_tasks_user_status` (`tenantId`, `requestedBy`, `status`),
  KEY `IDX_ptl_pick_tasks_sku` (`tenantId`, `sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ptl_pick_task_items` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `taskId` char(36) NOT NULL,
  `locationId` char(36) NOT NULL,
  `locationCode` varchar(50) NOT NULL,
  `inventoryLocationId` char(36) DEFAULT NULL,
  `deviceId` char(36) DEFAULT NULL,
  `ledIndex` int DEFAULT NULL,
  `status` enum(
    'PENDING',
    'LIGHTING',
    'ACTIVE',
    'CONFIRMED',
    'CANCELLED',
    'EXPIRED',
    'FAILED',
    'SKIPPED'
  ) NOT NULL DEFAULT 'PENDING',
  `quantity` decimal(15,2) DEFAULT NULL,
  `availableQuantity` decimal(15,2) DEFAULT NULL,
  `batchNo` varchar(50) DEFAULT NULL,
  `expiryDate` date DEFAULT NULL,
  `requestId` varchar(64) DEFAULT NULL,
  `ackAt` datetime DEFAULT NULL,
  `confirmedAt` datetime DEFAULT NULL,
  `confirmedBy` char(36) DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_ptl_task_items_task` (`taskId`),
  KEY `IDX_ptl_task_items_location_status` (`tenantId`, `locationId`, `status`),
  KEY `IDX_ptl_task_items_request` (`tenantId`, `requestId`),
  CONSTRAINT `FK_ptl_task_items_task`
    FOREIGN KEY (`taskId`) REFERENCES `ptl_pick_tasks` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_ptl_task_items_location`
    FOREIGN KEY (`locationId`) REFERENCES `locations` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_ptl_task_items_inventory_location`
    FOREIGN KEY (`inventoryLocationId`) REFERENCES `inventory_locations` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `FK_ptl_task_items_device`
    FOREIGN KEY (`deviceId`) REFERENCES `devices` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
