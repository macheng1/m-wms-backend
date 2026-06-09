-- M-WMS backend schema init SQL
-- Generated from current entity definitions on 2026-04-20
-- Target: MySQL 5.7+/8+ or compatible MariaDB

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` char(36) NOT NULL,
  `code` varchar(50) NOT NULL COMMENT '企业唯一编码（用于登录/识别）',
  `name` varchar(255) NOT NULL COMMENT '工厂/租户全称',
  `industryCode` varchar(50) DEFAULT NULL COMMENT '所属行业代码',
  `contactPerson` varchar(255) DEFAULT NULL COMMENT '联系人',
  `contactPhone` varchar(255) DEFAULT NULL COMMENT '联系电话',
  `address` text DEFAULT NULL COMMENT '工厂详细地址',
  `factoryAddress` text DEFAULT NULL COMMENT '工厂地址(别名)',
  `registerAddress` text DEFAULT NULL COMMENT '公司注册地址',
  `website` varchar(255) DEFAULT NULL COMMENT '官网',
  `remark` text DEFAULT NULL COMMENT '备注',
  `taxNo` varchar(50) DEFAULT NULL COMMENT '税号',
  `taxpayerType` varchar(255) DEFAULT NULL COMMENT '纳税人类型',
  `creditCode` varchar(100) DEFAULT NULL COMMENT '统一社会信用代码',
  `bankName` varchar(255) DEFAULT NULL COMMENT '开户行',
  `bankAccount` varchar(255) DEFAULT NULL COMMENT '银行账号',
  `businessLicenseNo` varchar(100) DEFAULT NULL COMMENT '营业执照号',
  `businessLicenseExpire` date DEFAULT NULL COMMENT '营业执照有效期',
  `legalPerson` varchar(255) DEFAULT NULL COMMENT '法人代表',
  `registeredCapital` varchar(255) DEFAULT NULL COMMENT '注册资本',
  `industryType` varchar(255) DEFAULT NULL COMMENT '行业分类',
  `qualificationNo` varchar(100) DEFAULT NULL COMMENT '资质证书编号',
  `qualificationExpire` date DEFAULT NULL COMMENT '资质证书有效期',
  `email` varchar(255) DEFAULT NULL COMMENT '联系邮箱',
  `fax` varchar(255) DEFAULT NULL COMMENT '传真',
  `foundDate` date DEFAULT NULL COMMENT '成立日期',
  `staffCount` int DEFAULT NULL COMMENT '员工人数',
  `mainProducts` text DEFAULT NULL COMMENT '主要产品',
  `annualCapacity` varchar(255) DEFAULT NULL COMMENT '年产能',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '租户状态：是否激活 (1启用/0禁用)',
  `isApproved` tinyint NOT NULL DEFAULT 0 COMMENT '审核状态：1通过，0待审核',
  `lifecycleStatus` enum('pending','active','rejected','disabled','expired') NOT NULL DEFAULT 'pending' COMMENT '租户生命周期状态',
  `expiresAt` datetime DEFAULT NULL COMMENT '到期时间',
  `approvedAt` datetime DEFAULT NULL COMMENT '审核通过时间',
  `auditRemark` text DEFAULT NULL COMMENT '审核备注',
  `disabledReason` text DEFAULT NULL COMMENT '禁用原因',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_tenants_code` (`code`),
  UNIQUE KEY `UQ_tenants_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `menus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL COMMENT '菜单唯一标识码，需与前端 MENU_CONFIG 的 code 一一对应',
  `scope` enum('platform','tenant') NOT NULL DEFAULT 'tenant' COMMENT '菜单归属域：platform-平台超级管理员，tenant-租户管理员/员工',
  `name` varchar(255) NOT NULL COMMENT '菜单名称',
  `routePath` varchar(255) DEFAULT NULL COMMENT '前端菜单路由，对应 my-wms 的实际页面路径',
  `componentPath` varchar(255) DEFAULT NULL COMMENT '前端组件路径，动态路由场景使用',
  `icon` varchar(255) DEFAULT NULL COMMENT '前端菜单图标标识',
  `sortOrder` int NOT NULL DEFAULT 0 COMMENT '菜单排序',
  `isHidden` tinyint NOT NULL DEFAULT 0 COMMENT '是否隐藏菜单',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1启用，0停用',
  `type` enum('DIRECTORY','MENU','BUTTON','API') NOT NULL DEFAULT 'MENU' COMMENT '菜单类型：目录、菜单、按钮、接口',
  `parentId` int NOT NULL DEFAULT 0 COMMENT '父级菜单ID，用于后台配置时的树形展示',
  `description` varchar(255) DEFAULT NULL COMMENT '描述信息',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_menus_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `units` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(50) NOT NULL,
  `code` varchar(20) NOT NULL,
  `category` enum('COUNT','WEIGHT','LENGTH','VOLUME','AREA','TIME') NOT NULL,
  `baseRatio` decimal(15,2) NOT NULL DEFAULT 1.00,
  `baseUnitCode` varchar(20) NOT NULL,
  `symbol` varchar(20) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `isActive` int NOT NULL DEFAULT 1,
  `sortOrder` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_units_tenant_code` (`tenantId`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attributes` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) NOT NULL COMMENT '属性显示名称，如：材质、直径',
  `code` varchar(255) NOT NULL COMMENT '属性业务标识码，如：material、diameter，方便系统逻辑识别',
  `type` enum('select','input','number') NOT NULL DEFAULT 'select' COMMENT '输入类型：select-下拉选择, input-手工输入, number-数字录入',
  `unit` varchar(255) DEFAULT NULL COMMENT '单位，如：mm, kg, 支',
  `isActive` int NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `isActive` int NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_categories_tenant_code` (`tenantId`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) NOT NULL COMMENT '角色名称',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '角色状态：1 启用，0 禁用',
  `code` varchar(255) DEFAULT NULL COMMENT '角色模板编码',
  `scope` enum('platform','tenant') NOT NULL DEFAULT 'tenant' COMMENT '角色归属域：platform-平台角色，tenant-租户角色',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `isSystem` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为系统初始化角色',
  `dataScope` enum('ALL','CUSTOM','DEPT','DEPT_AND_CHILD','SELF') NOT NULL DEFAULT 'ALL' COMMENT '数据权限范围',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `username` varchar(255) NOT NULL COMMENT '登录用户名',
  `password` varchar(255) NOT NULL COMMENT '哈希后的密码',
  `phone` varchar(255) DEFAULT NULL COMMENT '手机号',
  `email` varchar(255) DEFAULT NULL COMMENT '邮箱',
  `realName` varchar(255) DEFAULT NULL COMMENT '真实姓名',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像地址',
  `firstName` varchar(255) DEFAULT NULL COMMENT '名',
  `lastName` varchar(255) DEFAULT NULL COMMENT '姓',
  `deptId` char(36) DEFAULT NULL COMMENT '所属部门ID',
  `postId` char(36) DEFAULT NULL COMMENT '所属岗位ID',
  `isPlatformAdmin` tinyint NOT NULL DEFAULT 0 COMMENT '是否为平台级超级管理员',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '账号是否激活',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_users_tenant_username` (`tenantId`,`username`),
  KEY `IDX_users_tenant` (`tenantId`),
  KEY `IDX_users_dept` (`deptId`),
  KEY `IDX_users_post` (`postId`),
  CONSTRAINT `FK_users_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) NOT NULL COMMENT '产品名称',
  `code` varchar(255) NOT NULL COMMENT '产品编码/SKU',
  `categoryId` char(36) NOT NULL COMMENT '类目ID',
  `unitId` char(36) NOT NULL COMMENT '库存主单位ID',
  `images` json DEFAULT NULL COMMENT '产品图片列表',
  `unit` varchar(255) DEFAULT NULL COMMENT '单位，如：支、kg',
  `specs` json DEFAULT NULL COMMENT '动态规格详情',
  `safetyStock` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '安全库存',
  `isActive` int NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_products_tenant_code` (`tenantId`,`code`),
  KEY `IDX_products_category` (`categoryId`),
  KEY `IDX_products_unit_id` (`unitId`),
  CONSTRAINT `FK_products_category` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FK_products_unit` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `locations` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `warehouse` varchar(20) NOT NULL,
  `area` varchar(20) NOT NULL,
  `shelf` varchar(20) DEFAULT NULL,
  `level` varchar(20) DEFAULT NULL,
  `position` varchar(20) DEFAULT NULL,
  `type` enum('STORAGE','PICKING','TEMP','RECEIVING','SHIPPING','DEFECT','RETURN') NOT NULL DEFAULT 'STORAGE',
  `status` enum('AVAILABLE','OCCUPIED','LOCKED','RESERVED','DISABLED') NOT NULL DEFAULT 'AVAILABLE',
  `capacity` decimal(10,2) DEFAULT NULL,
  `capacityUnit` varchar(20) DEFAULT NULL,
  `dimensions` json DEFAULT NULL,
  `coordinates` json DEFAULT NULL,
  `deviceIds` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_locations_tenant_code` (`tenantId`,`code`),
  KEY `location_tenant_code_idx` (`tenantId`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `devices` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('SCANNER','RFID_READER','RFID_TAG','AGV','ESL','SENSOR','PRINTER','GATE','CAMERA','PDA') NOT NULL,
  `status` enum('ONLINE','OFFLINE','ERROR','MAINTENANCE','DISABLED') NOT NULL DEFAULT 'OFFLINE',
  `locationId` char(36) DEFAULT NULL,
  `config` json DEFAULT NULL,
  `lastHeartbeat` datetime DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_devices_tenant_code` (`tenantId`,`code`),
  KEY `device_tenant_code_idx` (`tenantId`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `productName` varchar(200) NOT NULL,
  `quantity` decimal(15,2) NOT NULL DEFAULT 0.00,
  `lockedQuantity` decimal(15,2) NOT NULL DEFAULT 0.00,
  `unitId` char(36) DEFAULT NULL,
  `locationId` char(36) DEFAULT NULL,
  `multiUnitQty` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `inventory_tenant_sku_idx` (`tenantId`,`sku`),
  KEY `inventory_unit_id_idx` (`unitId`),
  KEY `inventory_location_id_idx` (`locationId`),
  CONSTRAINT `FK_inventory_unit` FOREIGN KEY (`unitId`) REFERENCES `units` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_locations` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `productName` varchar(200) NOT NULL,
  `locationId` char(36) NOT NULL,
  `quantity` decimal(15,2) NOT NULL DEFAULT 0.00,
  `unitId` char(36) DEFAULT NULL,
  `batchNo` varchar(50) DEFAULT NULL,
  `productionDate` date DEFAULT NULL,
  `expiryDate` date DEFAULT NULL,
  `lockedQuantity` decimal(15,2) NOT NULL DEFAULT 0.00,
  `realtimeData` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `inv_loc_tenant_sku_idx` (`tenantId`,`sku`),
  KEY `inv_loc_tenant_location_idx` (`tenantId`,`locationId`),
  KEY `inv_loc_location_id_idx` (`locationId`),
  CONSTRAINT `FK_inventory_locations_location` FOREIGN KEY (`locationId`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `sku` varchar(100) NOT NULL,
  `productName` varchar(200) NOT NULL,
  `transactionType` enum(
    'INBOUND_PURCHASE','INBOUND_RETURN','INBOUND_TRANSFER','INBOUND_PRODUCTION',
    'OUTBOUND_SALES','OUTBOUND_MATERIAL','OUTBOUND_TRANSFER','OUTBOUND_SCRAP',
    'STOCK_LOCK','STOCK_RELEASE',
    'ADJUSTMENT_IN','ADJUSTMENT_OUT'
  ) NOT NULL,
  `quantity` decimal(15,2) NOT NULL,
  `unitId` char(36) DEFAULT NULL,
  `beforeQty` decimal(15,2) NOT NULL,
  `afterQty` decimal(15,2) NOT NULL,
  `orderNo` varchar(100) DEFAULT NULL,
  `locationId` char(36) DEFAULT NULL,
  `remark` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_inventory_transactions_unitId` (`unitId`),
  KEY `inventory_transaction_location_id_idx` (`locationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `orderNumber` varchar(50) NOT NULL,
  `source` enum('MINIAPP','WEBSITE','ADMIN') NOT NULL DEFAULT 'ADMIN',
  `orderType` enum('STANDARD','CUSTOM') NOT NULL DEFAULT 'STANDARD',
  `status` enum(
    'PENDING_CONFIRM',
    'PENDING_REVIEW',
    'REJECTED',
    'CONFIRMED',
    'PROCESSING',
    'STOCK_LOCKED',
    'OUT_OF_STOCK',
    'PENDING_SCHEDULE',
    'SCHEDULED',
    'PRODUCING',
    'PRODUCED',
    'PENDING_SHIPMENT',
    'SHIPPED',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING_CONFIRM',
  `customerName` varchar(80) DEFAULT NULL,
  `customerPhone` varchar(30) DEFAULT NULL,
  `customerEmail` varchar(120) DEFAULT NULL,
  `customerAddress` varchar(255) DEFAULT NULL,
  `miniappMemberId` char(36) DEFAULT NULL,
  `totalAmount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `remark` text DEFAULT NULL,
  `reviewRemark` text DEFAULT NULL,
  `rejectReason` text DEFAULT NULL,
  `expectedDeliveryDate` datetime DEFAULT NULL,
  `scheduledStartDate` datetime DEFAULT NULL,
  `scheduledEndDate` datetime DEFAULT NULL,
  `producedAt` datetime DEFAULT NULL,
  `shippedAt` datetime DEFAULT NULL,
  `completedAt` datetime DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_orders_tenant_orderNumber` (`tenantId`,`orderNumber`),
  KEY `IDX_orders_miniapp_member` (`miniappMemberId`,`source`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `orderId` char(36) NOT NULL,
  `productId` char(36) DEFAULT NULL,
  `sku` varchar(80) DEFAULT NULL,
  `productName` varchar(120) NOT NULL,
  `quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `unitCode` varchar(30) DEFAULT NULL,
  `unitName` varchar(30) DEFAULT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `specs` json DEFAULT NULL,
  `customRequirement` text DEFAULT NULL,
  `drawingUrls` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_order_items_tenant_order` (`tenantId`,`orderId`),
  CONSTRAINT `FK_order_items_order` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_flow_logs` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `orderId` char(36) NOT NULL,
  `fromStatus` varchar(40) DEFAULT NULL,
  `toStatus` varchar(40) NOT NULL,
  `action` varchar(50) NOT NULL,
  `operatorId` char(36) DEFAULT NULL,
  `operatorName` varchar(80) DEFAULT NULL,
  `remark` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_order_flow_logs_tenant_order` (`tenantId`,`orderId`),
  CONSTRAINT `FK_order_flow_logs_order` FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portal_configs` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `title` varchar(255) DEFAULT NULL COMMENT '网站标题',
  `logo` varchar(255) DEFAULT NULL COMMENT '网站Logo URL',
  `slogan` varchar(255) DEFAULT NULL COMMENT '宣传标语/Slogan',
  `description` text DEFAULT NULL COMMENT '工厂简介/关于我们',
  `footerInfo` json DEFAULT NULL COMMENT '页脚配置信息',
  `seoConfig` json DEFAULT NULL COMMENT 'SEO 优化配置',
  `homeConfig` json DEFAULT NULL COMMENT '首页模块配置',
  `isActive` int NOT NULL DEFAULT 1 COMMENT '站点状态：1开启，0关闭',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) NOT NULL COMMENT '访客姓名',
  `phone` varchar(255) NOT NULL COMMENT '联系电话',
  `message` text NOT NULL COMMENT '留言内容/需求描述',
  `status` varchar(20) NOT NULL DEFAULT 'unread' COMMENT '处理状态：unread-未读, read-已读, replied-已回复',
  `adminRemark` text DEFAULT NULL COMMENT '后台管理员备注',
  `attachments` text DEFAULT NULL COMMENT '附件列表，逗号分隔的文件路径或URL',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `userId` char(36) DEFAULT NULL,
  `roleId` char(36) DEFAULT NULL,
  `type` enum('SYSTEM','MESSAGE','MENTION','TICKET','WORKFLOW') NOT NULL DEFAULT 'SYSTEM',
  `category` enum(
    'INVENTORY_WARNING','INVENTORY_CHANGE',
    'ORDER_CREATED','ORDER_UPDATED','ORDER_CANCELLED','ORDER_SHIPPED',
    'CONSULTATION','REPLY',
    'SYSTEM_MAINTENANCE','SYSTEM_ANNOUNCEMENT',
    'APPROVAL_PENDING','APPROVAL_APPROVED','APPROVAL_REJECTED'
  ) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `data` json DEFAULT NULL,
  `priority` enum('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `readAt` datetime DEFAULT NULL,
  `expireAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `notification_tenant_user_idx` (`tenantId`,`userId`),
  KEY `notification_tenant_idx` (`tenantId`),
  KEY `notification_user_read_idx` (`userId`,`isRead`),
  KEY `notification_created_idx` (`createdAt`),
  KEY `notification_user_id_idx` (`userId`),
  KEY `notification_expire_idx` (`expireAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dictionaries` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `scope` enum('platform','tenant') NOT NULL DEFAULT 'platform' COMMENT '字典归属域：platform-平台标准字典，tenant-租户自定义字典',
  `type` varchar(255) NOT NULL COMMENT '字典类型，如 INDUSTRY, UNIT, MATERIAL',
  `label` varchar(255) NOT NULL COMMENT '展示名称 (前端 label)',
  `value` varchar(255) NOT NULL COMMENT '实际存值 (前端 value)',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序',
  `isActive` int NOT NULL DEFAULT 1 COMMENT '状态：1启用，0禁用',
  `isSystem` tinyint NOT NULL DEFAULT 0 COMMENT '是否系统内置字典，内置字典不建议删除',
  `allowTenantExtend` tinyint NOT NULL DEFAULT 0 COMMENT '是否允许租户扩展',
  `allowTenantOverride` tinyint NOT NULL DEFAULT 0 COMMENT '是否允许租户覆盖',
  `parentId` char(36) DEFAULT NULL COMMENT '继承的平台字典ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attribute_options` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID',
  `attributeId` char(36) NOT NULL,
  `value` varchar(255) NOT NULL COMMENT '具体选项值，如：304、12.5',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '属性状态：1 启用，0 禁用',
  `sort` int NOT NULL DEFAULT 0 COMMENT '排序，用于前端下拉框展示顺序',
  PRIMARY KEY (`id`),
  KEY `IDX_attribute_options_tenantId` (`tenantId`),
  KEY `IDX_attribute_options_attributeId` (`attributeId`),
  CONSTRAINT `FK_attribute_options_attribute` FOREIGN KEY (`attributeId`) REFERENCES `attributes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_menus` (
  `roleId` char(36) NOT NULL,
  `menuId` int NOT NULL,
  PRIMARY KEY (`roleId`,`menuId`),
  KEY `IDX_role_menus_menuId` (`menuId`),
  CONSTRAINT `FK_role_menus_role` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_role_menus_menu` FOREIGN KEY (`menuId`) REFERENCES `menus` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_menu_permissions` (
  `tenantId` char(36) NOT NULL,
  `menuId` int NOT NULL,
  PRIMARY KEY (`tenantId`,`menuId`),
  KEY `IDX_tenant_menu_permissions_menuId` (`menuId`),
  CONSTRAINT `FK_tenant_menu_permissions_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_tenant_menu_permissions_menu` FOREIGN KEY (`menuId`) REFERENCES `menus` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，平台操作为空',
  `userId` char(36) DEFAULT NULL COMMENT '操作人ID',
  `username` varchar(255) DEFAULT NULL COMMENT '操作人账号',
  `scope` enum('platform','tenant') NOT NULL COMMENT '操作域',
  `module` varchar(255) NOT NULL COMMENT '业务模块',
  `action` varchar(255) NOT NULL COMMENT '操作动作',
  `targetType` varchar(255) DEFAULT NULL COMMENT '目标类型',
  `targetId` varchar(255) DEFAULT NULL COMMENT '目标ID',
  `description` text DEFAULT NULL COMMENT '操作描述',
  `beforeData` json DEFAULT NULL COMMENT '操作前数据',
  `afterData` json DEFAULT NULL COMMENT '操作后数据',
  `ip` varchar(255) DEFAULT NULL COMMENT 'IP地址',
  PRIMARY KEY (`id`),
  KEY `IDX_operation_logs_tenant_created` (`tenantId`,`createdAt`),
  KEY `IDX_operation_logs_user_created` (`userId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `departments` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `parentId` char(36) DEFAULT NULL COMMENT '父部门ID，顶级为空',
  `deptCode` varchar(50) NOT NULL COMMENT '部门编码',
  `deptName` varchar(100) NOT NULL COMMENT '部门名称',
  `orderNum` int NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `leader` varchar(100) DEFAULT NULL COMMENT '负责人',
  `phone` varchar(50) DEFAULT NULL COMMENT '联系电话',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1正常，0停用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_departments_tenant_code` (`tenantId`,`deptCode`),
  KEY `IDX_departments_tenant_parent` (`tenantId`,`parentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `posts` (
  `id` char(36) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `postCode` varchar(50) NOT NULL COMMENT '岗位编码',
  `postName` varchar(100) NOT NULL COMMENT '岗位名称',
  `postSort` int NOT NULL DEFAULT 0 COMMENT '显示顺序',
  `isActive` tinyint NOT NULL DEFAULT 1 COMMENT '状态：1正常，0停用',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_posts_tenant_code` (`tenantId`,`postCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_departments` (
  `roleId` char(36) NOT NULL,
  `departmentId` char(36) NOT NULL,
  PRIMARY KEY (`roleId`,`departmentId`),
  KEY `IDX_role_departments_departmentId` (`departmentId`),
  CONSTRAINT `FK_role_departments_role` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_role_departments_department` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `usersId` char(36) NOT NULL,
  `rolesId` char(36) NOT NULL,
  PRIMARY KEY (`usersId`,`rolesId`),
  KEY `IDX_user_roles_rolesId` (`rolesId`),
  CONSTRAINT `FK_user_roles_user` FOREIGN KEY (`usersId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_user_roles_role` FOREIGN KEY (`rolesId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `category_attributes` (
  `categoriesId` char(36) NOT NULL,
  `attributesId` char(36) NOT NULL,
  PRIMARY KEY (`categoriesId`,`attributesId`),
  KEY `IDX_category_attributes_attributesId` (`attributesId`),
  CONSTRAINT `FK_category_attributes_category` FOREIGN KEY (`categoriesId`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_category_attributes_attribute` FOREIGN KEY (`attributesId`) REFERENCES `attributes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `device_events` (
  `id` char(36) NOT NULL,
  `tenantId` char(36) NOT NULL,
  `deviceId` char(36) NOT NULL,
  `eventType` varchar(50) NOT NULL,
  `eventData` json NOT NULL,
  `processed` tinyint(1) NOT NULL DEFAULT 0,
  `errorMessage` text DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `device_event_tenant_device_idx` (`tenantId`,`deviceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
