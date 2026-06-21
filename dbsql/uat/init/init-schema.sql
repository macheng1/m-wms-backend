-- M-WMS backend 完整建表 SQL（基础字段表）— uat 环境
-- 来源：wms_uat 活库实际结构  生成日期：2026-06-21
-- 影响范围：仅建表，不含数据；执行前先选中目标库（USE xxx;）
-- 执行环境：MySQL 5.7+/8+ 或兼容 MariaDB

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- 表 `attributes` ----------
CREATE TABLE IF NOT EXISTS `attributes` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '属性显示名称，如：材质、直径',
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '属性业务标识码，如：material、diameter，方便系统逻辑识别',
  `type` enum('select','input','number') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'select' COMMENT '输入类型：select-下拉选择, input-手工输入, number-数字录入',
  `unit` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '单位，如：mm, kg, 支',
  `isActive` int(11) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `attribute_options` ----------
CREATE TABLE IF NOT EXISTS `attribute_options` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID',
  `attributeId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '具体选项值，如：304、12.5',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '属性状态：1 启用，0 禁用',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序，用于前端下拉框展示顺序',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `categories` ----------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` int(11) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `category_attributes` ----------
CREATE TABLE IF NOT EXISTS `category_attributes` (
  `categoriesId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attributesId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`categoriesId`,`attributesId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `departments` ----------
CREATE TABLE IF NOT EXISTS `departments` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `parentId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '父部门ID，顶级为空',
  `deptCode` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '部门编码',
  `deptName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '部门名称',
  `orderNum` int(11) NOT NULL DEFAULT '0' COMMENT '显示顺序',
  `leader` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '负责人',
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1正常，0停用',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `devices` ----------
CREATE TABLE IF NOT EXISTS `devices` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('SCANNER','RFID_READER','RFID_TAG','AGV','ESL','SENSOR','PRINTER','GATE','CAMERA','PDA','PTL_CONTROLLER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ONLINE','OFFLINE','ERROR','MAINTENANCE','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OFFLINE',
  `locationId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `config` json DEFAULT NULL,
  `lastHeartbeat` datetime DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deviceUid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_2548e2115fc8d1a02c109aedb5` (`deviceUid`),
  KEY `device_tenant_code_idx` (`tenantId`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `device_events` ----------
CREATE TABLE IF NOT EXISTS `device_events` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deviceId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `eventData` json NOT NULL,
  `processed` tinyint(1) NOT NULL DEFAULT '0',
  `errorMessage` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `device_event_tenant_device_idx` (`tenantId`,`deviceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `dictionaries` ----------
CREATE TABLE IF NOT EXISTS `dictionaries` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典类型，如 INDUSTRY, UNIT, MATERIAL',
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '展示名称 (前端 label)',
  `value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '实际存值 (前端 value)',
  `sort` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `isActive` int(11) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  `scope` enum('platform','tenant') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'platform' COMMENT '字典归属域：platform-平台标准字典，tenant-租户自定义字典',
  `isSystem` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否系统内置字典，内置字典不建议删除',
  `allowTenantExtend` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否允许租户扩展',
  `allowTenantOverride` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否允许租户覆盖',
  `parentId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '继承的平台字典ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `inquiries` ----------
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '访客姓名',
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系电话',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '留言内容/需求描述',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unread' COMMENT '处理状态：unread-未读, read-已读, replied-已回复',
  `adminRemark` text COLLATE utf8mb4_unicode_ci COMMENT '后台管理员备注',
  `attachments` text COLLATE utf8mb4_unicode_ci COMMENT '附件列表，逗号分隔的文件路径或URL',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `inventory` ----------
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productName` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(15,2) NOT NULL DEFAULT '0.00',
  `unitId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `multiUnitQty` json DEFAULT NULL,
  `lockedQuantity` decimal(15,2) NOT NULL DEFAULT '0.00',
  `lastSource` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastOperatorId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastOperatorName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_unit_id_idx` (`unitId`),
  KEY `inventory_location_id_idx` (`locationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `inventory_locations` ----------
CREATE TABLE IF NOT EXISTS `inventory_locations` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productName` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locationId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(15,2) NOT NULL DEFAULT '0.00',
  `unitId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batchNo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productionDate` date DEFAULT NULL,
  `expiryDate` date DEFAULT NULL,
  `lockedQuantity` decimal(15,2) NOT NULL DEFAULT '0.00',
  `realtimeData` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `inv_loc_tenant_sku_idx` (`tenantId`,`sku`),
  KEY `inv_loc_tenant_location_idx` (`tenantId`,`locationId`),
  KEY `inv_loc_location_id_idx` (`locationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `inventory_transactions` ----------
CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productName` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `transactionType` enum('INBOUND_PURCHASE','INBOUND_RETURN','INBOUND_TRANSFER','INBOUND_PRODUCTION','OUTBOUND_SALES','OUTBOUND_MATERIAL','OUTBOUND_TRANSFER','OUTBOUND_SCRAP','STOCK_LOCK','STOCK_RELEASE','ADJUSTMENT_IN','ADJUSTMENT_OUT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(15,2) NOT NULL,
  `unitId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `beforeQty` decimal(15,2) NOT NULL,
  `afterQty` decimal(15,2) NOT NULL,
  `orderNo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `source` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operatorId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operatorName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `inventory_transaction_location_id_idx` (`locationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `locations` ----------
CREATE TABLE IF NOT EXISTS `locations` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `warehouse` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `area` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `shelf` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('STORAGE','PICKING','TEMP','RECEIVING','SHIPPING','DEFECT','RETURN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STORAGE',
  `status` enum('AVAILABLE','OCCUPIED','LOCKED','RESERVED','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVAILABLE',
  `capacity` decimal(10,2) DEFAULT NULL,
  `capacityUnit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dimensions` json DEFAULT NULL,
  `coordinates` json DEFAULT NULL,
  `deviceIds` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `location_tenant_code_idx` (`tenantId`,`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `location_light_tasks` ----------
CREATE TABLE IF NOT EXISTS `location_light_tasks` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locationId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locationCode` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deviceCode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deviceUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ledIndex` int(11) DEFAULT NULL,
  `action` enum('ON','OFF') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','SUCCESS','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `duration` int(11) NOT NULL DEFAULT '60',
  `color` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'yellow',
  `payload` json DEFAULT NULL,
  `errorMessage` text COLLATE utf8mb4_unicode_ci,
  `executedAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `location_light_task_tenant_location_idx` (`tenantId`,`locationId`),
  KEY `FK_location_light_tasks_location` (`locationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `menus` ----------
CREATE TABLE IF NOT EXISTS `menus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜单唯一标识码，需与前端 MENU_CONFIG 的 code 一一对应',
  `scope` enum('platform','tenant') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tenant' COMMENT '菜单归属域：platform-平台超级管理员，tenant-租户管理员/员工',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜单名称',
  `routePath` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '前端菜单路由，对应 my-wms 的实际页面路径',
  `componentPath` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '前端组件路径，动态路由场景使用',
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '前端菜单图标标识',
  `sortOrder` int(11) NOT NULL DEFAULT '0' COMMENT '菜单排序',
  `isHidden` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否隐藏菜单',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0停用',
  `type` enum('DIRECTORY','MENU','BUTTON','API') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MENU' COMMENT '菜单类型：目录、菜单、按钮、接口',
  `parentId` int(11) NOT NULL DEFAULT '0' COMMENT '父级菜单ID，用于后台配置时的树形展示',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述信息',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=437 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `migrations` ----------
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` bigint(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4;

-- ---------- 表 `miniapp_banners` ----------
CREATE TABLE IF NOT EXISTS `miniapp_banners` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '轮播图标题',
  `imageUrl` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '图片 URL',
  `linkType` enum('none','page','webview','post','category') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none' COMMENT '跳转类型：none不跳转/page小程序页面/webview网页/post信息详情/category分类',
  `linkValue` text COLLATE utf8mb4_unicode_ci COMMENT '跳转地址或目标ID',
  `sortOrder` int(11) NOT NULL DEFAULT '0' COMMENT '排序，越小越靠前',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0停用',
  PRIMARY KEY (`id`),
  KEY `IDX_miniapp_banner_sort` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `miniapp_categories` ----------
CREATE TABLE IF NOT EXISTS `miniapp_categories` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称',
  `code` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类编码',
  `iconUrl` text COLLATE utf8mb4_unicode_ci COMMENT '分类图标 URL',
  `linkUrl` text COLLATE utf8mb4_unicode_ci COMMENT '点击跳转 URL',
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类说明',
  `templateFields` json DEFAULT NULL COMMENT '发布字段模板 JSON',
  `sortOrder` int(11) NOT NULL DEFAULT '0' COMMENT '排序，越小越靠前',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_miniapp_category_code` (`code`),
  KEY `IDX_miniapp_category_sort` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `miniapp_members` ----------
CREATE TABLE IF NOT EXISTS `miniapp_members` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'wechat' COMMENT '小程序平台：wechat/toutiao',
  `appId` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '小程序 AppID',
  `openId` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '小程序 openId',
  `unionId` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '小程序 unionId',
  `sessionKey` text COLLATE utf8mb4_unicode_ci COMMENT '小程序 session_key',
  `nickName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '会员昵称',
  `avatarUrl` text COLLATE utf8mb4_unicode_ci COMMENT '头像 URL',
  `phoneNumber` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '手机号',
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '性别',
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '国家',
  `province` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '省份',
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '城市',
  `loginCount` int(11) NOT NULL DEFAULT '0' COMMENT '登录次数',
  `lastLoginAt` datetime DEFAULT NULL COMMENT '最后登录时间',
  `lastLoginIp` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '最后登录 IP',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1正常，0禁用',
  `isAuthorization` varchar(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '是否同意隐私协议：1是，0否',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '绑定租户ID',
  `tenantBindStatus` enum('none','pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none' COMMENT '企业绑定状态',
  `tenantRole` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '企业角色：owner/admin/staff',
  `tenantBindRemark` text COLLATE utf8mb4_unicode_ci COMMENT '企业绑定备注/驳回原因',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '后台备注',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_miniapp_member_openid` (`platform`,`appId`,`openId`),
  KEY `IDX_miniapp_member_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `miniapp_posts` ----------
CREATE TABLE IF NOT EXISTS `miniapp_posts` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `categoryId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '小程序分类ID',
  `memberId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发布会员ID',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '企业租户ID',
  `title` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标题',
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '发布内容',
  `structuredData` json DEFAULT NULL COMMENT '结构化发布字段 JSON',
  `region` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '地区',
  `imgList` text COLLATE utf8mb4_unicode_ci COMMENT '图片/图纸 URL，逗号分隔',
  `viewNum` int(11) NOT NULL DEFAULT '0' COMMENT '浏览次数',
  `status` enum('pending','published','rejected','offline') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '状态：pending待审核/published已发布/rejected已驳回/offline已下架',
  `auditRemark` text COLLATE utf8mb4_unicode_ci COMMENT '审核/驳回原因',
  `auditedById` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核人ID',
  `auditedByName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核人名称',
  `auditedAt` datetime DEFAULT NULL COMMENT '审核时间',
  PRIMARY KEY (`id`),
  KEY `IDX_miniapp_post_category` (`categoryId`),
  KEY `IDX_miniapp_post_status_created` (`status`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `miniapp_post_collections` ----------
CREATE TABLE IF NOT EXISTS `miniapp_post_collections` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  `memberId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '会员ID',
  `postId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '信息ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_miniapp_post_collection_unique` (`memberId`,`postId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `miniapp_post_views` ----------
CREATE TABLE IF NOT EXISTS `miniapp_post_views` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `postId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '信息ID',
  `memberId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '浏览会员ID',
  `ip` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '浏览IP',
  `userAgent` text COLLATE utf8mb4_unicode_ci COMMENT '浏览客户端 UA',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  PRIMARY KEY (`id`),
  KEY `IDX_miniapp_post_view_post_created` (`postId`,`createdAt`),
  KEY `IDX_miniapp_post_view_member_created` (`memberId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `notifications` ----------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `roleId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('SYSTEM','MESSAGE','MENTION','TICKET','WORKFLOW') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SYSTEM',
  `category` enum('INVENTORY_WARNING','INVENTORY_CHANGE','ORDER_CREATED','ORDER_UPDATED','ORDER_CANCELLED','ORDER_SHIPPED','CONSULTATION','REPLY','SYSTEM_MAINTENANCE','SYSTEM_ANNOUNCEMENT','APPROVAL_PENDING','APPROVAL_APPROVED','APPROVAL_REJECTED') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json DEFAULT NULL,
  `priority` enum('LOW','NORMAL','HIGH','URGENT') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
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

-- ---------- 表 `operation_logs` ----------
CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，平台操作为空',
  `userId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人ID',
  `username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人账号',
  `scope` enum('platform','tenant') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作域',
  `module` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '业务模块',
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作动作',
  `targetType` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目标类型',
  `targetId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目标ID',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '操作描述',
  `beforeData` json DEFAULT NULL COMMENT '操作前数据',
  `afterData` json DEFAULT NULL COMMENT '操作后数据',
  `ip` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `orders` ----------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderNumber` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING_CONFIRM','PENDING_REVIEW','REJECTED','CONFIRMED','PROCESSING','STOCK_LOCKED','OUT_OF_STOCK','PENDING_SCHEDULE','SCHEDULED','PRODUCING','PRODUCED','PENDING_SHIPMENT','SHIPPED','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING_CONFIRM',
  `totalAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `source` enum('MINIAPP','WEBSITE','ADMIN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ADMIN',
  `orderType` enum('STANDARD','CUSTOM') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STANDARD',
  `stockLocked` tinyint(4) NOT NULL DEFAULT '0',
  `customerName` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerPhone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerEmail` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerAddress` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `miniappMemberId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `reviewRemark` text COLLATE utf8mb4_unicode_ci,
  `rejectReason` text COLLATE utf8mb4_unicode_ci,
  `expectedDeliveryDate` datetime DEFAULT NULL,
  `scheduledStartDate` datetime DEFAULT NULL,
  `scheduledEndDate` datetime DEFAULT NULL,
  `producedAt` datetime DEFAULT NULL,
  `shippedAt` datetime DEFAULT NULL,
  `completedAt` datetime DEFAULT NULL,
  `cancelledAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `order_flow_logs` ----------
CREATE TABLE IF NOT EXISTS `order_flow_logs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fromStatus` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `toStatus` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operatorId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operatorName` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_order_flow_logs_order` (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `order_items` ----------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sku` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productName` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(12,2) NOT NULL DEFAULT '0.00',
  `unitCode` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unitName` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `specs` json DEFAULT NULL,
  `customRequirement` text COLLATE utf8mb4_unicode_ci,
  `drawingUrls` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_order_items_order` (`orderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `permissions` ----------
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限唯一标识码，需与前端 MENU_CONFIG 的 code 一一对应',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限名称',
  `type` enum('DIRECTORY','MENU','BUTTON','API') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MENU' COMMENT '权限类型：目录、菜单、按钮、接口',
  `parentId` int(11) NOT NULL DEFAULT '0' COMMENT '父级权限ID，用于后台配置时的树形展示',
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述信息',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `scope` enum('platform','tenant') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tenant' COMMENT '权限归属域：platform-平台超级管理员，tenant-租户管理员/员工',
  `routePath` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '前端菜单路由，对应 my-wms 的实际页面路径',
  `componentPath` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '前端组件路径，动态路由场景使用',
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '前端菜单图标标识',
  `sortOrder` int(11) NOT NULL DEFAULT '0' COMMENT '菜单排序',
  `isHidden` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否隐藏菜单',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0停用',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=494 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `portal_configs` ----------
CREATE TABLE IF NOT EXISTS `portal_configs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '网站标题',
  `logo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '网站Logo URL',
  `slogan` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '宣传标语/Slogan',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '工厂简介/关于我们',
  `footerInfo` json DEFAULT NULL COMMENT '页脚配置信息',
  `seoConfig` json DEFAULT NULL COMMENT 'SEO 优化配置',
  `isActive` int(11) NOT NULL DEFAULT '1' COMMENT '站点状态：1开启，0关闭',
  `homeConfig` json DEFAULT NULL COMMENT '首页模块配置',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `portal_jobs` ----------
CREATE TABLE IF NOT EXISTS `portal_jobs` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `position` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '招聘职位',
  `count` int(11) NOT NULL DEFAULT '1' COMMENT '招聘人数',
  `salary` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '薪资范围',
  `location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '工作地点',
  `experience` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '经验要求',
  `education` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '学历要求',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '职位描述',
  `requirement` text COLLATE utf8mb4_unicode_ci COMMENT '任职要求',
  `sortOrder` int(11) NOT NULL DEFAULT '0' COMMENT '排序',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1发布，0下架',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `posts` ----------
CREATE TABLE IF NOT EXISTS `posts` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `postCode` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '岗位编码',
  `postName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '岗位名称',
  `postSort` int(11) NOT NULL DEFAULT '0' COMMENT '显示顺序',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1正常，0停用',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `products` ----------
CREATE TABLE IF NOT EXISTS `products` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品名称',
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品编码/SKU',
  `categoryId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '类目ID',
  `images` json DEFAULT NULL COMMENT '产品图片列表',
  `unit` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '单位，如：支、kg',
  `specs` json DEFAULT NULL COMMENT '动态规格详情',
  `safetyStock` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '安全库存',
  `isActive` int(11) NOT NULL DEFAULT '1' COMMENT '状态：1启用，0禁用',
  `barcode` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '产品条形码，默认与产品编码/SKU一致',
  `unitId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '库存主单位ID',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '产品描述',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `ptl_location_bindings` ----------
CREATE TABLE IF NOT EXISTS `ptl_location_bindings` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locationId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deviceId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ledIndex` int(11) NOT NULL,
  `defaultColor` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'blue',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_ptl_binding_tenant_location` (`tenantId`,`locationId`),
  UNIQUE KEY `UQ_ptl_binding_tenant_device_led` (`tenantId`,`deviceId`,`ledIndex`),
  KEY `IDX_ptl_binding_tenant_device` (`tenantId`,`deviceId`),
  KEY `FK_ptl_binding_location` (`locationId`),
  KEY `FK_ptl_binding_device` (`deviceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `ptl_pick_tasks` ----------
CREATE TABLE IF NOT EXISTS `ptl_pick_tasks` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `taskNo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productName` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('CREATED','LIGHTING','ACTIVE','PARTIAL_CONFIRMED','COMPLETED','CANCELLED','EXPIRED','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CREATED',
  `source` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'APP',
  `requestedBy` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `totalLocations` int(11) NOT NULL DEFAULT '0',
  `confirmedLocations` int(11) NOT NULL DEFAULT '0',
  `ttlSeconds` int(11) NOT NULL DEFAULT '600',
  `expiresAt` datetime NOT NULL,
  `closedAt` datetime DEFAULT NULL,
  `errorMessage` text COLLATE utf8mb4_unicode_ci,
  `metadata` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_ptl_pick_tasks_task_no` (`tenantId`,`taskNo`),
  KEY `IDX_ptl_pick_tasks_status_expire` (`tenantId`,`status`,`expiresAt`),
  KEY `IDX_ptl_pick_tasks_user_status` (`tenantId`,`requestedBy`,`status`),
  KEY `IDX_ptl_pick_tasks_sku` (`tenantId`,`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `ptl_pick_task_items` ----------
CREATE TABLE IF NOT EXISTS `ptl_pick_task_items` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `taskId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locationId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `locationCode` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `inventoryLocationId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deviceId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ledIndex` int(11) DEFAULT NULL,
  `status` enum('PENDING','LIGHTING','ACTIVE','CONFIRMED','CANCELLED','EXPIRED','FAILED','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `quantity` decimal(15,2) DEFAULT NULL,
  `availableQuantity` decimal(15,2) DEFAULT NULL,
  `batchNo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expiryDate` date DEFAULT NULL,
  `requestId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ackAt` datetime DEFAULT NULL,
  `confirmedAt` datetime DEFAULT NULL,
  `confirmedBy` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `errorMessage` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_ptl_task_items_task` (`taskId`),
  KEY `IDX_ptl_task_items_location_status` (`tenantId`,`locationId`,`status`),
  KEY `IDX_ptl_task_items_request` (`tenantId`,`requestId`),
  KEY `FK_ptl_task_items_location` (`locationId`),
  KEY `FK_ptl_task_items_inventory_location` (`inventoryLocationId`),
  KEY `FK_ptl_task_items_device` (`deviceId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `roles` ----------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '角色状态：1 启用，0 禁用',
  `code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '角色模板编码',
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `isSystem` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为系统初始化角色',
  `scope` enum('platform','tenant') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'tenant' COMMENT '角色归属域：platform-平台角色，tenant-租户角色',
  `dataScope` enum('ALL','CUSTOM','DEPT','DEPT_AND_CHILD','SELF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ALL' COMMENT '数据权限范围：全部、自定义部门、本部门、本部门及以下、仅本人',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `role_departments` ----------
CREATE TABLE IF NOT EXISTS `role_departments` (
  `roleId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `departmentId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`roleId`,`departmentId`),
  KEY `IDX_role_departments_departmentId` (`departmentId`),
  CONSTRAINT `FK_role_departments_department` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_role_departments_role` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `role_menus` ----------
CREATE TABLE IF NOT EXISTS `role_menus` (
  `roleId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menuId` int(11) NOT NULL,
  PRIMARY KEY (`roleId`,`menuId`),
  KEY `IDX_role_menus_menuId` (`menuId`),
  CONSTRAINT `FK_role_menus_menu` FOREIGN KEY (`menuId`) REFERENCES `menus` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_role_menus_role` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `role_permissions` ----------
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `rolesId` varchar(36) NOT NULL,
  `permissionsId` int(11) NOT NULL,
  PRIMARY KEY (`rolesId`,`permissionsId`),
  KEY `IDX_0cb93c5877d37e954e2aa59e52` (`rolesId`),
  KEY `IDX_d422dabc78ff74a8dab6583da0` (`permissionsId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 表 `tenants` ----------
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '企业唯一编码（用于登录/识别）',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '工厂/租户全称',
  `industryCode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属行业代码',
  `contactPerson` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系人',
  `contactPhone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `address` text COLLATE utf8mb4_unicode_ci COMMENT '工厂详细地址',
  `factoryAddress` text COLLATE utf8mb4_unicode_ci COMMENT '工厂地址(别名)',
  `registerAddress` text COLLATE utf8mb4_unicode_ci COMMENT '公司注册地址',
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '官网',
  `remark` text COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `taxNo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '税号',
  `taxpayerType` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '纳税人类型',
  `creditCode` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '统一社会信用代码',
  `bankName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '开户行',
  `bankAccount` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '银行账号',
  `businessLicenseNo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '营业执照号',
  `businessLicenseExpire` date DEFAULT NULL COMMENT '营业执照有效期',
  `legalPerson` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '法人代表',
  `registeredCapital` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '注册资本',
  `industryType` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '行业分类',
  `qualificationNo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '资质证书编号',
  `qualificationExpire` date DEFAULT NULL COMMENT '资质证书有效期',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系邮箱',
  `fax` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '传真',
  `foundDate` date DEFAULT NULL COMMENT '成立日期',
  `staffCount` int(11) DEFAULT NULL COMMENT '员工人数',
  `mainProducts` text COLLATE utf8mb4_unicode_ci COMMENT '主要产品',
  `annualCapacity` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '年产能',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '租户状态：是否激活 (1启用/0禁用)',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  `tenantSource` enum('platform','miniapp','import','api') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'platform' COMMENT '租户来源：platform平台后台/miniapp小程序/import导入/api开放接口',
  `isApproved` tinyint(4) NOT NULL DEFAULT '0' COMMENT '审核状态：1通过，0待审核',
  `lifecycleStatus` enum('pending','active','rejected','disabled','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '租户生命周期状态',
  `expiresAt` datetime DEFAULT NULL COMMENT '到期时间',
  `approvedAt` datetime DEFAULT NULL COMMENT '审核通过时间',
  `auditRemark` text COLLATE utf8mb4_unicode_ci COMMENT '审核备注',
  `disabledReason` text COLLATE utf8mb4_unicode_ci COMMENT '禁用原因',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `tenant_menu_permissions` ----------
CREATE TABLE IF NOT EXISTS `tenant_menu_permissions` (
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menuId` int(11) NOT NULL,
  PRIMARY KEY (`tenantId`,`menuId`),
  KEY `IDX_tenant_menu_permissions_menuId` (`menuId`),
  CONSTRAINT `FK_tenant_menu_permissions_new_menu` FOREIGN KEY (`menuId`) REFERENCES `menus` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_tenant_menu_permissions_new_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `units` ----------
CREATE TABLE IF NOT EXISTS `units` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('COUNT','WEIGHT','LENGTH','VOLUME','AREA','TIME') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COUNT',
  `symbol` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` int(11) NOT NULL DEFAULT '1',
  `sortOrder` int(11) NOT NULL DEFAULT '0',
  `baseRatio` decimal(15,2) NOT NULL DEFAULT '1.00',
  `baseUnitCode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `unit_conversions` ----------
CREATE TABLE IF NOT EXISTS `unit_conversions` (
  `id` varchar(36) NOT NULL,
  `tenantId` varchar(36) DEFAULT NULL,
  `fromUnitCode` varchar(20) NOT NULL,
  `toUnitCode` varchar(20) NOT NULL,
  `ratio` decimal(15,4) NOT NULL DEFAULT '1.0000',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deletedAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- 表 `users` ----------
CREATE TABLE IF NOT EXISTS `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '最后更新时间',
  `deletedAt` datetime(6) DEFAULT NULL COMMENT '删除时间（伪删除标记）',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户ID，如果是平台管理员则为空',
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '登录用户名',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '哈希后的密码',
  `phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '手机号',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `realName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '真实姓名',
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像地址',
  `firstName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '名',
  `lastName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '姓',
  `isPlatformAdmin` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否为平台级超级管理员',
  `isActive` tinyint(4) NOT NULL DEFAULT '1' COMMENT '账号是否激活',
  `deptId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属部门ID',
  `postId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属岗位ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- 表 `user_roles` ----------
CREATE TABLE IF NOT EXISTS `user_roles` (
  `usersId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rolesId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`usersId`,`rolesId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
