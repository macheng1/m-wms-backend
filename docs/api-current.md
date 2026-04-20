# M-WMS Backend 现有接口文档（基于当前代码）

更新时间：2026-04-20

## 1. 全局约定

- 基础前缀：`/api`（来自 `API_PREFIX`）
- Swagger：`/api-docs`
- 默认鉴权：全局 `JwtAuthGuard` 生效，除非接口标注 `@Public()`
- 租户透传：多数业务接口依赖 `x-tenant-id`（通过 `@TenantId()` 或 JWT 中 `tenantId`）
- 统一响应包装：
  - 成功：`{ code: 200, data, message: "请求成功" }`
  - 失败：HTTP 仍返回 200，业务错误放在 `code/message/data`

## 2. 鉴权说明

- `Public` 接口（无需 JWT）：
  - `POST /api/user/login`
  - `POST /api/tenants/onboard`
  - `POST /api/tenants/public/list`
  - `POST /api/tenants/public/detail`
  - `GET /api/send/sendSMS`
  - `POST /api/upload/fileList`
  - `GET /api/portal/:domain/init`
  - `GET /api/portal/:domain/products/:id`
  - `POST /api/portal/:domain/inquiry`
  - `GET /api/notifications/subscribe`（接口内手动校验 JWT）
  - `POST /api/notifications/public/consultation`
  - `POST /api/products/public/page`
  - `POST /api/products/public/detail`
- 其余接口默认需要 `Authorization: Bearer <token>`

## 3. 接口清单（按模块）

### 3.1 健康检查

- `GET /api/health`：服务健康状态

### 3.2 认证 Auth

- `POST /api/user/register`：注册（需租户上下文）
- `POST /api/user/login`：登录，返回 `access_token`

### 3.3 租户 Tenant

- `POST /api/tenants/onboard`（Public）：新租户入驻
- `POST /api/tenants/list`：租户分页
- `POST /api/tenants/public/list`（Public）：第三方租户分页
- `POST /api/tenants/detail`：租户详情
- `POST /api/tenants/public/detail`（Public）：第三方租户详情
- `PATCH /api/tenants/:id`：更新租户
- `DELETE /api/tenants/:id`：删除租户

### 3.4 用户 Users

- `GET /api/users/getUserInfo`：当前用户信息
- `GET /api/users/page`：用户分页
- `POST /api/users/save`：新增用户
- `POST /api/users/update`：更新用户
- `POST /api/users/password`：个人改密
- `POST /api/users/reset`：管理员重置密码
- `POST /api/users/status`：用户状态变更
- `POST /api/users/delete`：删除用户
- `POST /api/users/detail`：用户详情

### 3.5 角色 Roles

- `POST /api/roles`：创建角色
- `GET /api/roles`：角色分页
- `GET /api/roles/:id`：角色详情
- `POST /api/roles/:id/update`：更新角色
- `DELETE /api/roles/:id`：删除角色
- `POST /api/roles/:id/status`：角色状态变更
- `POST /api/roles/selectRoleLists`：角色下拉列表

### 3.6 单位 Units

- `POST /api/units/save`：创建单位
- `POST /api/units/update`：更新单位
- `GET /api/units`：单位列表
- `GET /api/units/active`：启用单位列表
- `GET /api/units/page`：单位分页
- `POST /api/units/detail`：单位详情（支持 `id` 或 `code`）
- `POST /api/units/delete`：删除单位

### 3.7 产品 Products / Attributes / Options / Categories

产品：
- `GET /api/products/select`：产品下拉
- `POST /api/products/save`：创建产品
- `POST /api/products/update`：更新产品
- `GET /api/products/page`：产品分页
- `GET /api/products/detail`：产品详情
- `POST /api/products/status`：产品状态变更
- `POST /api/products/delete`：删除产品
- `GET /api/products/template`：下载产品导入模板
- `POST /api/products/import`：导入产品（`multipart/form-data`, 字段 `file`）
- `POST /api/products/public/page`（Public）：第三方产品分页
- `POST /api/products/public/detail`（Public）：第三方产品详情

属性：
- `GET /api/attributes/page`
- `POST /api/attributes/save`
- `POST /api/attributes/update`
- `GET /api/attributes/detail`
- `POST /api/attributes/delete`
- `POST /api/attributes/batchDelete`
- `POST /api/attributes/status`
- `GET /api/attributes/template`
- `POST /api/attributes/import`（`multipart/form-data`, 字段 `file`）

规格值：
- `GET /api/options/page`
- `POST /api/options/save`
- `POST /api/options/update`
- `GET /api/options/detail`
- `POST /api/options/delete`
- `POST /api/options/batchDelete`
- `POST /api/options/status`

类目：
- `POST /api/categories/save`
- `GET /api/categories/page`
- `GET /api/categories/detail`
- `POST /api/categories/status`
- `POST /api/categories/update`
- `POST /api/categories/delete`

### 3.8 库存 Inventory

- `POST /api/inventory`：创建库存
- `GET /api/inventory`：库存列表
- `GET /api/inventory/page`：库存分页
- `GET /api/inventory/alerts`：库存预警
- `GET /api/inventory/transactions`：库存流水分页
- `GET /api/inventory/available-for-outbound`：可出库库存下拉
- `GET /api/inventory/inbound`：入库流水
- `POST /api/inventory/inbound`：入库
- `POST /api/inventory/inbound/batch`：批量入库
- `POST /api/inventory/adjust`：库存调整
- `GET /api/inventory/outbound`：出库流水
- `POST /api/inventory/outbound`：出库
- `POST /api/inventory/outbound/batch`：批量出库
- `GET /api/inventory/:id`：库存详情
- `PATCH /api/inventory/:id`：更新库存
- `DELETE /api/inventory/:id`：删除库存
- `GET /api/inventory/:sku/transactions`：SKU库存流水

### 3.9 库位 Location

- `POST /api/locations`：创建库位
- `POST /api/locations/batch`：批量创建库位（预留）
- `GET /api/locations`：库位列表
- `GET /api/locations/available-for-selection`：可选库位下拉
- `GET /api/locations/:id`：库位详情
- `GET /api/locations/code/:code`：按编码查询库位
- `PUT /api/locations/:id`：更新库位
- `DELETE /api/locations/:id`：删除库位
- `POST /api/locations/:id/bind-device`：绑定设备（预留）
- `POST /api/locations/:id/unbind-device`：解绑设备（预留）
- `POST /api/locations/:id/realtime`：实时数据更新（预留）

### 3.10 订单 Order

- `POST /api/orders`：创建订单
- `GET /api/orders`：订单列表
- `GET /api/orders/:id`：订单详情
- `PATCH /api/orders/:id`：更新订单
- `DELETE /api/orders/:id`：删除订单

### 3.11 门户 Portal

管理端（需JWT）：
- `GET /api/portal/config`：网站配置
- `PATCH /api/portal/config`：更新网站配置
- `GET /api/portal/inquiries`：访客询盘分页

公开端（Public）：
- `GET /api/portal/:domain/init`：门户初始化数据
- `GET /api/portal/:domain/products/:id`：门户产品详情
- `POST /api/portal/:domain/inquiry`：提交询盘

### 3.12 通知 Notifications

- `GET /api/notifications/subscribe`（Public）：SSE 订阅（需在 Header/Cookie 传 token，接口内校验）
- `POST /api/notifications/send`：广播通知
- `POST /api/notifications/send-to-users`：按用户推送
- `POST /api/notifications/send-to-role`：按角色推送（当前用户列表查询为 TODO）
- `POST /api/notifications/list`：通知列表
- `POST /api/notifications/read`：标记已读
- `GET /api/notifications/unread-count`：未读统计
- `GET /api/notifications/stats`：连接统计
- `POST /api/notifications/public/consultation`（Public）：公开咨询并触发通知

### 3.13 上传 Upload

- `POST /api/upload/fileList`（Public）：多文件上传，`multipart/form-data` 字段名 `file`，最多 6 个

### 3.14 短信 SMS

- `GET /api/send/sendSMS?phone=...`（Public）：发送短信验证码

## 4. 当前未生效接口（代码存在，但模块未挂载）

以下接口代码文件存在，但目前不会注册到运行中的应用（`SystemModule` 已从 `AppModule` 移除）：

- `GET /api/dicts/options`
- `GET /api/dicts/list`
- `POST /api/dicts/save`
- `POST /api/dicts/delete`
- `POST /api/dicts/update`

对应控制器：`src/modules/system/controller/dictionaries.controller.ts`

## 5. 建议的后续维护方式

- 新增/修改接口后，同步更新本文件。
- 对外联调优先使用 Swagger：`/api-docs`。
- 若计划彻底移除字典管理，可删除 `src/modules/system` 目录与相关 DTO/Service/Entity。
