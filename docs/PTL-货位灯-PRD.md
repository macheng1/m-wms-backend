# M-WMS 货位灯（Pick-to-Light）产品需求文档（PRD）

| 项 | 内容 |
|---|---|
| 文档版本 | v1.0 |
| 创建日期 | 2026-06-16 |
| 状态 | 草案（硬件/固件 POC 已验证通过，软件待开发；2026-06-19 补充任务闭环/并发/DB 设计建议） |
| 关联系统 | m-wms-backend（NestJS 后端）、wms-app（Android/iOS 客户端）、ESP32 货位灯硬件 |

---

## 1. 背景与目标

### 1.1 问题
仓管员在仓库中**找货效率低**：拿到一个 SKU，要在货架间逐个查找它在哪个库位，靠人眼和经验，慢且易错。现有系统（m-wms）只能在屏幕上显示库位编码（如 `A01-01-03`），仓管员仍需自行在物理空间中定位。

### 1.2 目标
做一套**软硬结合的快速找货系统**：仓管员在 App 输入/扫描 SKU，系统**自动点亮该 SKU 所在货位的指示灯**，仓管员循灯而至，秒级定位；取货后扫码确认，灯灭，形成闭环。

### 1.3 目标用户
- **租户员工（仓管员）**：找货、拣货、确认。
- **租户管理员**：维护货位↔灯的绑定、查看设备状态。

### 1.4 价值
- 找货时间从"分钟级翻找"降到"秒级循灯"。
- 降低拿错货位/拿错 SKU 的概率（配合扫码确认防错）。
- 库存数据有唯一库位维度口径，作业可追溯。

---

## 2. 名词定义

| 术语 | 含义 |
|---|---|
| 货位灯 / PTL | Pick-to-Light，装在货位上的指示灯，可被远程点亮 |
| 控制器（Controller） | 一片 ESP32，驱动一条灯带、管一个货架（多个货位） |
| 灯序号（ledIndex） | 灯带上第几颗灯珠（0 起），对应一个物理货位 |
| 库位（Location） | 已有概念，仓库-区域-货架-层-位，唯一编码 |
| 找货任务（PTL Task） | 一次"点亮某 SKU 库位灯"的业务实例，可包含多个库位，含状态、确认、超时和取消 |
| 点灯指令日志（Light Task） | 一次对某个库位/灯珠下发 ON/OFF 指令的技术日志，现有 `location_light_tasks` 可继续复用 |
| 控制器 ACK | ESP32 收到 MQTT 指令后的确认事件，用于判断点灯/灭灯是否真实送达 |
| 主单位 | 产品库存的计量基准单位（已有概念） |

---

## 3. 范围

### 3.1 本期范围（In Scope）
- 按 SKU 查询库位分布接口。
- 货位灯设备（控制器）与库位↔灯绑定管理。
- 按 SKU 远程点亮对应库位灯。
- 扫码/按钮确认 → 灭灯 → 实时回推 App。
- 设备在线状态监控。
- App：找货页（查库位 + 一键亮灯 + 确认状态）。
- 管理后台：控制器列表、库位灯绑定、校准、解绑、设备状态。

### 3.2 暂不包含（Out of Scope）
- 拣货单批量点亮（多货位边走边拣）——列入后续。
- 按颜色区分多人/多任务——后续（硬件已支持 RGB）。
- 离线推送、AGV/货到人。
- 物理硬件的 PCB 量产（先用开发板+模块）。
- 找货确认不扣减库存，不改变订单状态；库存扣减仍由现有出入库/拣货业务负责。
- 本期不做多人颜色区分；同一库位同一时间只允许一个活跃 PTL 找货任务占用。

---

## 4. 用户场景 / 用户故事

### US-1 找货（核心）
> 作为仓管员，我扫描一个产品条码（或输入 SKU），希望对应货位的灯亮起来，这样我能立刻走到货位前，而不用逐架翻找。

**主流程**
1. 仓管员在 App「找货」页扫码/输入 SKU。
2. App 展示该 SKU 的库位列表（库位码、现存/可用数量、单位）。
3. 点「一键亮灯」，对应货位灯**蓝色闪烁**。
4. 仓管员循灯走到货位，取货。
5. 扫货位码（或产品码）确认 → 灯灭，App 该库位标记「已找到 ✓」。

**异常流**
- 该 SKU 无库存/无库位：提示「该 SKU 暂无库位库存」。
- 该库位未绑定灯：列表正常显示，但「亮灯」对该库位无效，标注「未绑定灯」。
- 控制器离线：提示「货架 X 设备离线，请人工按库位码查找」，仍显示库位码兜底。
- 扫错库位码：提示「货位不属于当前任务」，不灭灯。
- 扫错产品码：提示「产品与当前找货任务不一致」，不灭灯。
- 任务超时：自动灭灯，App 标记「已超时」，可重新发起。

### US-2 设备绑定（校准）
> 作为租户管理员，我需要把"某货位"和"某控制器的第几颗灯"绑定起来，这样系统才知道点哪颗灯。

**流程**：后台进入校准模式 → 选控制器 → 系统逐颗点亮灯 → 管理员扫对应货位码完成绑定，写入 `ptl_location_bindings`。

**补充规则**
- 校准点亮单颗灯，默认 5 秒自动灭灯，避免误留亮灯。
- 同一库位只能绑定一个灯位；同一控制器的同一 `ledIndex` 只能绑定一个库位。
- 解绑/修改绑定前，如果该库位存在活跃 PTL 任务，应禁止操作并提示先关闭任务。

### US-3 设备监控
> 作为管理员，我要看到哪些货架的控制器在线/离线，及时发现掉线设备。

---

## 4.1 角色与权限

| 角色 | 可用能力 |
|---|---|
| 仓管员/租户员工 | 查 SKU 库位、点亮、手动灭灯、扫码确认、查看本人任务状态 |
| 租户管理员 | 仓管员能力 + 控制器管理、库位灯绑定/解绑、校准、设备监控、查看租户内全部 PTL 任务 |
| 平台管理员 | 查看/维护全局设备能力（如有平台后台），不得跨租户直接点灯，除非进入租户上下文 |

权限建议沿用现有菜单/按钮权限体系，新增 PTL 菜单与按钮权限：
- `ptl:controller:list/create/update/delete`
- `ptl:device:list/create/update/delete/calibrate`
- `ptl:task:light-up/light-off/confirm`

## 4.2 找货任务状态流转

| 状态 | 含义 | 进入条件 | 退出条件 |
|---|---|---|---|
| CREATED | 任务已创建，待下发点灯 | `POST /ptl/light-up` 校验通过 | 下发 MQTT |
| LIGHTING | 点灯指令已下发，等待 ACK 或确认 | MQTT 发布成功 | 收到全部 ACK / 部分失败 / 超时 |
| ACTIVE | 至少一个库位灯已亮，可执行确认 | 控制器 ACK 成功 | 部分确认、全部确认、取消、超时 |
| PARTIAL_CONFIRMED | 多库位任务中已有部分库位确认 | 任一库位确认成功 | 全部确认、取消、超时 |
| COMPLETED | 全部库位已确认并灭灯 | 所有任务明细确认成功 | 终态 |
| CANCELLED | 用户手动灭灯/取消 | `POST /ptl/light-off` | 终态 |
| EXPIRED | TTL 到期自动灭灯 | 超过任务有效期 | 终态 |
| FAILED | 全部可点亮库位下发失败 | MQTT 发布失败或 ACK 失败 | 终态，可重新发起 |

任务 TTL 默认 10 分钟；终态任务不再允许确认，重复确认已完成明细时幂等返回当前状态。

---

## 5. 功能需求

### 5.1 按 SKU 查库位（FR-1）
- 接口：`GET /api/inventory/locations?sku={sku}&onlyAvailable={bool}`
- 返回：SKU 头部（名称、单位、合计现存/锁定/可用）+ 各库位明细（库位码/名称/类型、现存/锁定/可用、单位、批次/效期、PTL 绑定状态、控制器在线状态、是否被活跃任务占用）。
- 可用量：`availableQuantity = quantity - lockedQuantity`。`onlyAvailable=true` 时过滤 `availableQuantity <= 0` 的库位。
- 排序：默认按可用量倒序；若存在 `expiryDate`，支持后续扩展 FEFO（近效期优先）。
- 多租户：强制按 `tenantId` 过滤（JWT 注入）。
- 查询只读，不锁库存、不扣库存、不生成库存流水。

### 5.2 货位灯点亮（FR-2）
- 接口：`POST /api/ptl/light-up { sku }`（亦支持 `{ locationIds }`）。
- 行为：
  1. 查该 SKU 在本租户的所有有货库位。
  2. 关联 PTL 绑定表取每个库位的 `deviceId/controllerCode + ledIndex`。
  3. 按控制器分组，向各控制器的 MQTT topic 发布点灯指令。
  4. 生成 PTL 找货任务（建议落库，Redis 仅做活跃任务/占用缓存），返回 `taskId`。
- 灯效：蓝色闪烁后常亮（可配色）。
- 未绑定灯的库位：跳过并在返回中标注。
- 控制器离线的库位：跳过点灯并在返回中标注，可人工按库位码查找。
- 若全部库位均无法点亮（无绑定/离线/被占用），接口返回业务失败，不创建活跃任务。
- 同一用户对同一 SKU 重复点灯：若存在本人未结束任务，默认返回已有 `taskId`，避免重复占用。
- 同一库位存在其他活跃任务：本期默认拒绝占用该库位，返回 `occupiedByTaskId` 与提示「该库位正在找货中」。

### 5.3 灭灯（FR-3）
- 接口：`POST /api/ptl/light-off { taskId }`。
- 行为：向相关控制器发布灭灯指令，关闭任务。
- 超时：任务 TTL 到期自动灭灯（固件侧 timeout 兜底 + 后端清理）。
- 幂等：对已关闭任务重复调用，返回当前终态，不重复创建 OFF 指令。
- 部分控制器灭灯失败时，任务状态进入 `CANCELLED`，失败明细记录错误并通过 App 提示「部分灯可能未熄灭，请现场确认」。

### 5.4 确认闭环（FR-4）
- 触发：① App 扫货位码/产品码确认；② 货位灯实体按钮（后续硬件支持）。
- 接口：`POST /api/ptl/confirm { taskId, locationId?, locationCode?, skuOrBarcode? }`。
- 行为：该库位灯灭；若任务全部确认则关闭任务；经 SSE 推送 App「已确认」。
- 复用现有 SSE（`SseConnectionManager.sendToUsers`），App 已接入。
- 校验规则：
  - `locationId/locationCode` 必须属于当前任务明细，否则不灭灯。
  - 扫产品码确认时，必须能匹配当前任务 SKU，否则不灭灯。
  - 已确认明细重复确认时幂等返回成功。
  - 终态任务不允许新增确认，返回「任务已结束」。

### 5.5 设备与绑定管理（FR-5）
- 控制器 CRUD：`/api/ptl/controllers`（code、name、deviceId/MAC、状态）。
- 绑定 CRUD：`/api/ptl/devices`（locationId、controllerId/deviceId、ledIndex、color）。
- 约束：`(tenantId, locationId)` 一对一；`(controllerId, ledIndex)` 唯一。
- 校准模式：`POST /api/ptl/controllers/{id}/calibrate { ledIndex }` 单独点亮某颗灯辅助绑定。
- 建议复用现有 `devices` 表存控制器，新增 `DeviceType.PTL_CONTROLLER`；绑定关系使用结构化表，不再长期依赖 `locations.metadata.deviceUrl/ledIndex`。

### 5.6 设备监控（FR-6）
- 控制器通过 MQTT 周期上报心跳，后端更新 `devices.status/lastHeartbeat`。
- 接口：`GET /api/ptl/controllers/status` 返回各控制器在线状态。
- 心跳默认 15 秒一次；超过 60 秒无心跳 → 标记 OFFLINE。
- 控制器断线重连后，应主动上报 `online` 事件，并执行本地清灯，避免历史残留亮灯。

### 5.7 App 找货页（FR-7）
- 入口：App 首页/仓储作业模块新增「找货」。
- 查询区：扫码/输入 SKU 或产品条码，支持清空与重新扫描。
- SKU 信息区：展示 SKU、产品名称、主单位、合计现存、锁定、可用。
- 库位列表字段：库位码、库位名称、可用量、批次、效期、绑定状态、控制器在线状态、灯状态、确认状态。
- 操作：一键亮灯、单库位亮灯、扫码确认、手动灭灯/取消。
- 状态文案：未绑定、设备离线、点灯中、已亮灯、确认中、已找到、已超时、点灯失败。

### 5.8 管理后台 PTL 页面（FR-8）
- 控制器列表：编码、名称、MAC/deviceId、状态、最后心跳、绑定灯位数、备注。
- 绑定管理：按仓库/区域/货架筛选库位，展示绑定控制器与 ledIndex，支持新增、编辑、解绑。
- 校准模式：选择控制器和 `ledIndex` 后单灯点亮，默认 5 秒自动熄灭；支持扫码绑定当前亮灯库位。
- 设备状态：在线/离线/故障列表，支持查看最近心跳和最近错误事件。

---

## 6. 非功能需求

| 类别 | 要求 |
|---|---|
| 性能 | 点亮指令端到端延迟 < 1s（局域网内）；查库位接口 P95 < 300ms |
| 可靠性 | 控制器断网自动重连；任务超时自动灭灯；后端无单点阻塞 |
| 多租户隔离 | 所有查询按 `tenantId` 过滤；MQTT topic 含 `tenantId`，配 ACL（生产） |
| 安全 | 生产 broker 启用账号密码 + TLS；接口走现有 JWT 鉴权 |
| 可维护 | 固件支持 OTA（后续）；设备以 MAC 唯一标识，配网不写死 |
| 可扩展 | 一控制器多灯（一货架多货位）；可水平增加控制器（多货架） |

---

## 7. 系统架构与数据流

```
┌─────────┐  HTTPS   ┌────────────────────┐  MQTT   ┌──────────────┐
│ wms-app │ ───────▶ │ m-wms-backend       │ ──────▶ │ ESP32 控制器   │
│ (找货页) │ ◀─────── │  - InventoryModule  │ ◀────── │ (一货架一片)   │
└─────────┘   SSE     │  - PtlModule(新增)  │  MQTT   └──────┬───────┘
                      │  - MqttService(新增)│              │ 数据线
                      └─────────┬──────────┘         ┌─────▼──────┐
                                │ Redis(任务/状态)     │ WS2812灯带  │
                                └────────             │ (一货位一灯) │
                                                      └────────────┘
```

数据流见 §4 US-1 主流程。**App 不直连灯**，统一经后端，保证多租户隔离与并发仲裁。

---

## 8. 数据模型

### 8.1 复用
- `locations`（库位，已有）
- `inventory_locations`（库位维度库存，已有，索引 `(tenantId, sku)`）
- `devices`（设备表，已有）：建议扩展 `DeviceType.PTL_CONTROLLER` 存 ESP32 控制器。
- `device_events`（设备事件日志，已有）：可记录心跳、ACK、按钮、错误事件。
- `location_light_tasks`（库位点灯指令日志，已有）：可继续记录单次 ON/OFF 指令执行结果，但不建议作为完整找货任务主表。

### 8.2 新增
**devices 扩展（推荐替代 `ptl_controllers`）**
| 字段 | 类型 | 说明 |
|---|---|---|
| type | enum | 新增 `PTL_CONTROLLER` |
| code | varchar(50) | 控制器编码，如 `SHELF-A`，用于 MQTT topic |
| name | varchar(100) | 控制器名称 |
| status | enum | 复用 ONLINE / OFFLINE / ERROR / MAINTENANCE / DISABLED |
| lastHeartbeat | datetime | 复用现有字段 |
| config | json | `{ protocol: "MQTT", mqttTopicPrefix, mac, firmwareVersion, ledCount, heartbeatInterval }` |
| metadata | json | `{ warehouse, area, shelf, ip, rssi, lastAckAt }` |

> DB 建议：如果 MySQL enum 已固定，需要 `ALTER TABLE devices MODIFY type enum(...,'PTL_CONTROLLER') NOT NULL`。若希望 MAC 全局唯一，可新增 `deviceUid` 字段；若短期不加字段，可先放入 `config.mac`，但唯一性无法由 DB 保障。

**ptl_location_bindings（新增，替代长期写入 `locations.metadata.ledIndex`）**
| 字段 | 类型 | 说明 |
|---|---|---|
| id | char(36) | 主键 |
| tenantId | char(36) | 租户 |
| locationId | char(36) | FK `locations.id` |
| deviceId | char(36) | FK `devices.id`，要求 `devices.type=PTL_CONTROLLER` |
| ledIndex | int | 灯带第几颗（0 起） |
| defaultColor | varchar(30) | 默认 `blue` |
| enabled | tinyint(1) | 是否启用，默认 1 |
| remark | text | 备注 |
| createdAt / updatedAt | datetime | 审计字段 |
| 约束 | | `(tenantId, locationId)` 唯一；`(tenantId, deviceId, ledIndex)` 唯一 |

**ptl_pick_tasks（新增，找货任务主表）**
| 字段 | 类型 | 说明 |
|---|---|---|
| id | char(36) | 主键 |
| tenantId | char(36) | 租户 |
| taskNo | varchar(50) | 业务编号，可选 |
| sku | varchar(100) | 找货 SKU |
| productName | varchar(200) | 冗余产品名 |
| status | enum | CREATED / LIGHTING / ACTIVE / PARTIAL_CONFIRMED / COMPLETED / CANCELLED / EXPIRED / FAILED |
| source | varchar(30) | APP / ADMIN / API |
| requestedBy | char(36) | 发起用户 |
| totalLocations | int | 本次涉及库位数 |
| confirmedLocations | int | 已确认库位数 |
| ttlSeconds | int | 默认 600 |
| expiresAt | datetime | 过期时间 |
| closedAt | datetime | 关闭时间 |
| errorMessage | text | 失败原因 |
| metadata | json | 扩展信息 |
| createdAt / updatedAt | datetime | 审计字段 |

**ptl_pick_task_items（新增，找货任务明细）**
| 字段 | 类型 | 说明 |
|---|---|---|
| id | char(36) | 主键 |
| tenantId | char(36) | 租户 |
| taskId | char(36) | FK `ptl_pick_tasks.id` |
| locationId | char(36) | FK `locations.id` |
| locationCode | varchar(50) | 冗余库位码 |
| inventoryLocationId | char(36) | 可空，关联具体库存明细 |
| deviceId | char(36) | 可空，控制器 |
| ledIndex | int | 可空，灯序号 |
| status | enum | PENDING / LIGHTING / ACTIVE / CONFIRMED / CANCELLED / EXPIRED / FAILED / SKIPPED |
| quantity | decimal(15,2) | 发起时现存量快照 |
| availableQuantity | decimal(15,2) | 发起时可用量快照 |
| batchNo / expiryDate | varchar/date | 批次与效期快照 |
| requestId | varchar(64) | MQTT 指令 requestId |
| ackAt | datetime | 控制器 ACK 时间 |
| confirmedAt | datetime | 确认时间 |
| confirmedBy | char(36) | 确认用户 |
| errorMessage | text | 明细错误 |
| createdAt / updatedAt | datetime | 审计字段 |

**Redis 活跃占用（推荐）**
- `ptl:task:{taskId}`：任务快照，TTL 10 分钟，用于 App 快速刷新。
- `ptl:location:active:{tenantId}:{locationId}`：活跃库位占用，value=`taskId`，TTL 跟随任务，用于并发控制。
- Redis 只做活跃态缓存；任务主数据落 DB，便于追溯、排障和后台查看。

### 8.3 DB 变更建议

1. `devices.type` 增加 `PTL_CONTROLLER`。
2. 新增 `ptl_location_bindings`，不要继续把正式绑定长期放在 `locations.metadata`。
3. 新增 `ptl_pick_tasks` 与 `ptl_pick_task_items`，承载业务闭环；现有 `location_light_tasks` 保留为底层指令日志。
4. `device_events.eventType` 建议规范为：`PTL_HEARTBEAT`、`PTL_ACK`、`PTL_BUTTON`、`PTL_ERROR`。
5. 索引建议：
   - `ptl_location_bindings(tenantId, locationId)` 唯一。
   - `ptl_location_bindings(tenantId, deviceId, ledIndex)` 唯一。
   - `ptl_pick_tasks(tenantId, status, expiresAt)` 用于扫描超时任务。
   - `ptl_pick_tasks(tenantId, requestedBy, status)` 用于查询本人活跃任务。
   - `ptl_pick_task_items(tenantId, locationId, status)` 用于判断库位是否被占用。
   - `ptl_pick_task_items(taskId)` 用于查任务明细。
6. 迁移兼容：
   - 已经配置在 `locations.metadata.deviceUrl/ledIndex/color/duration` 的 POC 数据，可在迁移脚本中生成 `devices` 和 `ptl_location_bindings`。
   - POC 的 HTTP 点灯接口可短期保留，正式 PTL 优先走 MQTT。

---

## 9. 接口设计

### 9.1 REST（全部走现有 JWT + `@TenantId`）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/inventory/locations?sku=` | 按 SKU 查库位分布（放在 `:id` 路由之前）|
| POST | `/ptl/light-up` | 点亮 SKU 库位灯，返回 taskId |
| POST | `/ptl/light-off` | 灭灯 |
| POST | `/ptl/confirm` | 确认某库位 |
| GET/POST/PUT/DELETE | `/ptl/controllers` | 控制器管理 |
| GET/POST/PUT/DELETE | `/ptl/devices` | 绑定管理 |
| POST | `/ptl/controllers/{id}/calibrate` | 校准点灯 |
| GET | `/ptl/controllers/status` | 在线状态 |

### 9.2 MQTT 协议
- 下发 `mwms/ptl/{tenantId}/{controllerCode}/cmd`：
  `{ "requestId": "r_001", "action": "on", "index": 5, "mode": "blink", "color": "blue", "taskId": "t_abc", "timeout": 600 }` / `{ "requestId": "r_002", "action": "off", "index": 5, "taskId": "t_abc" }`
- 上报 `mwms/ptl/{tenantId}/{controllerCode}/event`：
  `{ "type": "ack", "requestId": "r_001", "taskId": "t_abc", "index": 5, "success": true }`
  / `{ "type": "button", "index": 5, "taskId": "t_abc" }`
  / `{ "type": "heartbeat", "deviceId": "AABBCC", "firmwareVersion": "0.1.0", "rssi": -55 }`
  / `{ "type": "error", "requestId": "r_001", "code": "LED_OUT_OF_RANGE", "message": "index out of range" }`
- 后端订阅 `mwms/ptl/+/+/event` 统一处理。
- 后端下发每条指令必须带 `requestId`；控制器 ACK 超过 2 秒未返回时，明细标记失败或待人工确认。
- 控制器重连后先清灯，再上报 heartbeat，避免断网期间残留灯效。

### 9.3 SSE（复用）
- 确认事件经 `SseConnectionManager.sendToUsers(tenantId, userIds, { type: "ptl_confirmed", locationId, taskId })`，App SseClient 增加该类型处理。
- 建议新增事件类型：
  - `ptl_task_updated`：任务状态变化。
  - `ptl_item_updated`：单库位点灯/确认/失败。
  - `ptl_device_status_changed`：控制器在线状态变化。

---

## 10. 硬件与固件方案（概述）

- **控制器**：ESP32（YD-ESP32 / WROOM-32E），一货架一片，WiFi 连接。
- **灯带**：WS2812B/SK6812 5V，一货位一颗灯珠。
- **电平转换**：ESP32 数据 3.3V → 经 **74HCT245** 抬到 5V 驱动灯带（POC 证实：3.3V 直驱 5V 灯带首灯不亮，必须电平转换或降压供电）。
- **供电**：PTL 仅点亮少量灯，USB 5V 即可；整条全亮才需独立 5V 电源。
- **固件**：Arduino（Adafruit NeoPixel + PubSubClient + ArduinoJson），需升级为「按 controllerCode 订阅 + 解析 JSON 指令」；后续加配网、OTA、心跳。
- **演示形态**：控制部分（ESP32+电平转换）藏于盒中，正面为贴灯带的模拟货架板 + 货位标签；**无需 PCB 打样**。

---

## 11. 里程碑 / 分期

| 期 | 内容 | 验收 |
|---|---|---|
| **P1** | `GET /inventory/locations` + `MqttService` + `POST /ptl/light-up`（broker 用公共测试） | 调 `light-up` → 灯亮 |
| **P2** | 固件升级（JSON + controllerCode 订阅）+ 绑定表/绑定接口 + 校准 | 多货架按库位寻址点亮 |
| **P3** | confirm + SSE 回推 + App 找货页 | **端到端演示闭环跑通** |
| **P4** | 自建 Mosquitto + 认证/TLS/ACL；后台绑定/监控页；固件 OTA/心跳 | 生产可用 |

---

## 12. 验收标准（关键）

- AC-1：仓管员在 App 输入有库存的 SKU，2 秒内对应货位灯闪烁。
- AC-2：扫码确认后，对应灯在 1 秒内熄灭，App 卡片状态更新为「已找到」。
- AC-3：未绑定灯/控制器离线时，App 仍能展示库位码，给出明确提示，不报错崩溃。
- AC-4：A 租户无法点亮/查看 B 租户的灯与库位。
- AC-5：控制器断网后恢复，能自动重连并继续接收指令。
- AC-6：扫错货位码/产品码时不灭灯，并显示对应错误提示。
- AC-7：同一库位存在活跃 PTL 任务时，第二个任务不得重复占用该库位。
- AC-8：任务 TTL 到期后灯自动熄灭，任务状态变为 `EXPIRED`，App 展示「已超时」。
- AC-9：MQTT 发布失败或 ACK 失败时，任务明细记录失败原因，App 展示「点灯失败」。
- AC-10：管理员可完成控制器新增、绑定、校准、解绑、查看状态全流程。
- AC-11：DB 中可追溯一次找货任务的主表、明细、ACK/错误事件和底层点灯指令日志。

---

## 13. 风险与依赖

| 风险 | 影响 | 缓解 |
|---|---|---|
| 仓库 WiFi 覆盖差（金属货架衰减） | 控制器掉线 | 补 AP；心跳监控；离线兜底显示库位码 |
| 3.3V 数据电平问题 | 灯不亮/不稳 | 统一加 74HCT245 电平转换（已验证） |
| 公共 broker 不安全/不稳定 | 演示/生产风险 | P4 换自建 Mosquitto + 认证 |
| 灯↔货位映射错误 | 点错灯 | 校准流程 + 唯一约束 |
| 固件分散维护 | 升级成本 | 后续上 OTA |
| 同库位并发点灯 | 灯状态错乱 | Redis 活跃占用 + DB 明细状态约束 |
| 任务只存在 Redis | 无法审计/排障 | PTL 业务任务落 DB，Redis 仅做活跃缓存 |
| MQTT 已发布但控制器未执行 | App 状态误判 | 引入 requestId + ACK + 超时失败 |

---

## 14. 待确认问题

1. `DeviceType.PTL_CONTROLLER` 是否直接扩展现有 MySQL enum，还是重构为字典表/字符串字段？推荐短期扩 enum，长期再评估字典化。
2. 控制器 MAC 是否需要 DB 强唯一？推荐新增 `deviceUid` 或 `serialNo` 字段，避免只放 JSON。
3. App 单次点亮是默认点亮全部有货库位，还是先让用户选择目标库位？推荐 P1 点亮全部可用且已绑定库位，P2 支持单库位选择。
4. 找货任务保留多久？推荐主表/明细保留 180 天，底层 `location_light_tasks` 和 `device_events` 可按日志策略归档。
5. 近效期商品是否要求 FEFO 排序？推荐先保留可用量倒序，食品/药品类租户再开启 FEFO。

---

## 15. 附录：POC 已验证结论（截至 2026-06-16）

- ✅ 远程 MQTT 消息 → ESP32 → 点亮**指定**灯珠，整链路验证通过（公共 broker `broker.emqx.io`）。
- ✅ 固件可按消息内容点亮第 N 颗灯、`off` 全灭。
- ⚠️ 3.3V 数据直驱 5V 灯带首灯不亮 → 临时用 3V3 供电（偏暗）验证可亮；正式需 74HCT245 电平转换 5V。
- 环境：Arduino IDE 2.3.10 + esp32 3.3.10-cn（国内镜像）+ CH340 驱动；后端 m-wms-backend 暂无 MQTT 依赖，需新增。
