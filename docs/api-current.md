# M-WMS Backend 现有接口文档（基于当前代码）

更新时间：2026-05-23

## 1. 全局约定

- 基础前缀：`/api`（来自 `API_PREFIX`）
- Swagger：`/api-docs`
- 默认鉴权：全局 `JwtAuthGuard` 生效，除非接口标注 `@Public()`
- 租户来源：登录态接口优先从 JWT 中读取 `tenantId`；公开接口和服务器接口如需传 `tenantId`，必须显式校验调用来源和租户有效性
- 登录身份类型：对外统一使用 `userType: "platform" | "tenant"`；`isPlatformAdmin` 仅作为数据库内部字段，不再返回给前端。
- 统一响应包装：
  - 成功：`{ code: 200, data, message: "请求成功" }`
  - 失败：HTTP 仍返回 200，业务错误放在 `code/message/data`

## 2. 接口类型拆分规则

后端接口按调用方拆成四类。后续新增接口时，必须先判断属于哪一类，再设计 Controller 路径、鉴权、租户来源和限流策略。

### 2.1 管理端接口 Admin API

- 使用方：`my-wms` 管理后台。
- 建议路径：继续保留现有业务路径，例如 `/api/users`、`/api/products`、`/api/inventory`；后续大版本可评估统一迁移到 `/api/admin/*`。
- 鉴权方式：必须使用 `Authorization: Bearer <token>`。
- 租户来源：普通租户用户从 JWT 读取 `tenantId`；平台管理员可无 `tenantId`，但必须在 Service 层明确平台权限边界。
- 权限控制：需要接入 RBAC 权限码，不能只依赖登录态。
- 管理端内部拆分：
  - 平台域：`/api/admin/platform/*`，供平台超级管理员使用，管理租户、平台菜单、平台角色、平台用户和平台配置。
  - 租户域：`/api/admin/tenant/*`，供租户管理员和租户员工使用，管理本租户员工、角色、菜单和业务数据。
- 平台域和租户域的角色、菜单、权限建议通过 `scope = platform | tenant` 区分；租户域数据必须带 `tenantId`。
- 平台超级管理员如需处理租户业务数据，应通过明确的代管/切换租户上下文进入，不能默认跨租户混查。
- 典型接口：
  - 用户、角色、权限、租户管理
  - 产品、类目、属性、规格值
  - 库存、入库、出库、库位、订单
  - 门户配置、询盘管理、通知管理

### 2.2 官网接口 Portal API

- 使用方：`portal-websits` 门户官网。
- 建议路径：`/api/portal/:domain/*`。
- 鉴权方式：多数为 `@Public()`，但必须根据 `domain` 解析租户，不能让前端任意传可信 `tenantId`。
- 租户来源：通过 `domain` 查租户和门户配置。
- 数据范围：只返回官网需要展示的数据，不能复用管理端完整详情返回。
- 安全要求：询盘、咨询、上传等写入接口需要验证码、频率限制、字段长度限制和敏感内容过滤。
- 典型接口：
  - `GET /api/portal/:domain/init`
  - `GET /api/portal/:domain/products/:id`
  - `POST /api/portal/:domain/inquiry`

### 2.3 小程序接口 Miniapp API

- 使用方：小程序项目。
- 建议路径：`/api/miniapp/*`。
- 鉴权方式：小程序登录态，不直接复用管理端账号密码登录；建议使用小程序 `code -> openid/session` 换取后端 token。
- 租户来源：根据小程序配置、门店/企业码、用户绑定关系或扫码场景确定，不能让客户端随意指定可信 `tenantId`。
- 数据范围：只返回移动端页面需要的数据，字段要轻量，适配低带宽和分页加载。
- 安全要求：区分游客态、已登录用户、员工端/客户侧身份；涉及库存、订单、个人信息时必须有明确权限。
- 典型接口：
  - 小程序登录、手机号绑定、用户信息
  - 移动端产品/库存查询
  - 小程序询价、下单、消息通知

### 2.4 服务器调用接口 Open API

- 使用方：其他后端服务、第三方系统、客户自建系统。
- 建议路径：`/api/open/*` 或 `/api/open/v1/*`。
- 鉴权方式：不使用前端 JWT；建议使用 `appKey/appSecret`、签名、时间戳、nonce、防重放，或服务端专用 Bearer Token。
- 租户来源：通过应用凭证绑定租户，不信任请求体中的 `tenantId`；如必须传 `tenantId`，只能作为二次校验。
- 数据范围：接口契约必须稳定，建议版本化；返回字段不能直接暴露内部 Entity。
- 安全要求：需要 IP 白名单、签名校验、限流、调用日志、幂等键和错误码规范。
- 典型接口：
  - 第三方查询产品、库存、订单状态
  - 第三方创建订单、同步库存
  - Webhook 回调和异步通知

### 2.5 当前接口归类

- 管理端接口：
  - `/api/admin/meta`：管理端 API 边界信息
  - `/api/admin/platform/meta`：管理端平台域 API 边界信息
  - `/api/admin/platform/tenants`：平台域租户列表
  - `/api/admin/platform/tenants/list`：平台域租户分页列表
  - `/api/admin/platform/tenant-menus`：平台域租户统一菜单池
  - `/api/admin/platform/tenants/:id`：平台域租户详情
  - `/api/admin/platform/tenants/:id/menus`：平台域查询某租户已授权菜单
  - `/api/admin/platform/tenants/:id/menus/save`：平台域保存某租户菜单授权
  - `/api/admin/platform/tenants/:id/approve`：平台域审核通过租户
  - `/api/admin/platform/tenants/:id/reject`：平台域驳回并禁用租户
  - `/api/admin/platform/permissions`：平台域权限列表
  - `/api/admin/platform/menus`：平台域菜单列表
  - `/api/admin/platform/menus/list`：平台域菜单分页列表
  - `/api/admin/platform/menus/tree`：平台域菜单树
  - `/api/admin/platform/menus/:id`：平台域菜单详情
  - `/api/admin/platform/menus/save`：平台域保存菜单
  - `/api/admin/platform/menus/:id/delete`：平台域删除菜单
  - `/api/admin/platform/roles`：平台域角色列表
  - `/api/admin/platform/roles/save`：平台域保存角色
  - `/api/admin/platform/users/list`：平台域平台用户分页列表
  - `/api/admin/platform/users/:id`：平台域平台用户详情
  - `/api/admin/platform/users/save`：平台域保存平台用户
  - `/api/admin/platform/users/:id/status`：平台域平台用户状态变更
  - `/api/admin/tenant/meta`：管理端租户域 API 边界信息
  - `/api/admin/tenant/menus`：租户域当前租户已授权菜单
  - `/api/user/login`
  - `/api/user/register`
  - `/api/users/*`
  - `/api/roles/*`
  - `/api/tenants/list`
  - `/api/tenants/detail`
  - `/api/units/*`
  - `/api/products/*`，但不含 `/api/products/public/*`
  - `/api/attributes/*`
  - `/api/options/*`
  - `/api/categories/*`
  - `/api/inventory/*`
  - `/api/locations/*`
  - `/api/orders/*`
  - `/api/portal/config`
  - `/api/portal/inquiries`
  - `/api/notifications/*`，但不含 `/api/notifications/public/*`
- 官网接口：
  - `/api/portal/:domain/init`
  - `/api/portal/:domain/products/:id`
  - `/api/portal/:domain/inquiry`
  - `/api/notifications/public/consultation`
- 小程序接口：
  - `/api/miniapp/meta`：小程序 API 边界信息
  - 当前仅搭建独立命名空间骨架，后续小程序业务接口统一放到 `/api/miniapp/*`。
- 服务器调用接口：
  - `/api/open/v1/meta`：Open API 边界信息
  - 当前 `/api/products/public/page`、`/api/products/public/detail`、`/api/tenants/public/list`、`/api/tenants/public/detail` 属于“临时公开接口”，建议后续迁移到 `/api/open/v1/*`，并补充服务端鉴权。

## 3. 鉴权说明

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
  - `GET /api/miniapp/meta`
  - `GET /api/open/v1/meta`
  - `POST /api/products/public/page`
  - `POST /api/products/public/detail`
- 其余接口默认需要 `Authorization: Bearer <token>`

## 4. 接口清单（按模块）

### 4.1 健康检查

- `GET /api/health`：服务健康状态

### 4.2 认证 Auth

- `POST /api/user/register`：注册（需租户上下文）
- `POST /api/user/login`（Public）：登录
  - 请求体：
    - 平台管理员：`{ "username": "platform_admin", "password": "..." }`
    - 租户用户：`{ "code": "租户编码", "username": "...", "password": "..." }`
  - 返回 `data`：
    ```json
    {
      "access_token": "JWT_TOKEN",
      "userType": "platform",
      "tenantId": null
    }
    ```
  - 说明：`userType = "platform"` 表示平台管理员；`userType = "tenant"` 表示租户用户。前端不要再依赖 `isPlatformAdmin` 或 `isAdmin`。

### 4.3 租户 Tenant

- `POST /api/tenants/onboard`（Public）：新租户入驻
- `POST /api/tenants/list`：租户分页
- `POST /api/tenants/public/list`（Public）：第三方租户分页
- `POST /api/tenants/detail`：租户详情
- `POST /api/tenants/public/detail`（Public）：第三方租户详情
- `PATCH /api/tenants/:id`：更新租户
- `DELETE /api/tenants/:id`：删除租户

### 4.4 用户 Users

- `GET /api/users/getUserInfo`：当前用户信息
  - 返回 `data` 核心字段：
    ```json
    {
      "id": "用户ID",
      "username": "账号",
      "avatar": "头像",
      "realName": "姓名",
      "userType": "platform",
      "tenantId": null,
      "tenantName": "系统运营",
      "permissions": ["*"],
      "roleNames": ["平台超级管理员"]
    }
    ```
  - 说明：前端通过 `userType` 区分平台域和租户域菜单；租户管理员可能拥有 `permissions: ["*"]`，但仍然是 `userType = "tenant"`。
- `GET /api/users/page`：用户分页
- `GET /api/users/:id`：用户详情
- `POST /api/users/save`：新增用户；Body 支持 `username/password/realName/phone/email/deptId/postId/roleIds/isActive`
- `POST /api/users/update`：更新用户；Body 支持 `id/realName/phone/email/deptId/postId/roleIds/isActive`
- `POST /api/users/password`：个人改密
- `POST /api/users/reset`：管理员重置密码
- `POST /api/users/status`：用户状态变更
- `POST /api/users/delete`：删除用户
- `POST /api/users/detail`：用户详情，返回中使用 `userType` 表示身份类型

### 4.5 角色 Roles

- `POST /api/roles`：创建角色
- `GET /api/roles`：角色分页
- `GET /api/roles/page`：角色分页（推荐给前端使用）
- `GET /api/roles/options`：角色下拉列表
- `GET /api/roles/permissions/tree`：当前租户可分配权限树
- `GET /api/roles/:id`：角色详情
- `POST /api/roles/:id/update`：更新角色
- `DELETE /api/roles/:id`：删除角色
- `POST /api/roles/:id/status`：角色状态变更
- `POST /api/roles/save`：新增/更新角色；Body 支持 `id/name/code/isActive/remark/permissionCodes/permissionIds/dataScope/deptIds`
- `POST /api/roles/delete`：删除角色，Body：`{ "id": "" }`
- `POST /api/roles/selectRoleLists`：角色下拉列表
  - `dataScope` 可选值：`ALL` 全部数据、`CUSTOM` 自定义部门、`DEPT` 本部门、`DEPT_AND_CHILD` 本部门及以下、`SELF` 仅本人。

### 4.6 单位 Units

- `POST /api/units/save`：创建单位
- `POST /api/units/update`：更新单位
- `GET /api/units`：单位列表
- `GET /api/units/active`：启用单位列表
- `GET /api/units/page`：单位分页
- `POST /api/units/detail`：单位详情（支持 `id` 或 `code`）
- `POST /api/units/delete`：删除单位

### 4.7 产品 Products / Attributes / Options / Categories

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

### 4.8 库存 Inventory

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

### 4.9 库位 Location

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

### 4.10 订单 Order

- `POST /api/orders`：创建订单
- `GET /api/orders`：订单列表
- `GET /api/orders/:id`：订单详情
- `PATCH /api/orders/:id`：更新订单
- `DELETE /api/orders/:id`：删除订单

### 4.11 门户 Portal

管理端（需JWT）：
- `GET /api/admin/meta`：管理端 API 边界信息
- `GET /api/admin/platform/meta`：管理端平台域 API 边界信息
- `GET /api/admin/platform/dashboard`：平台数据看板，返回租户总数、待审核租户、运营中租户、平台用户数、平台角色数
- `GET /api/admin/platform/tenants`：平台域租户列表
- `POST /api/admin/platform/tenants/list`：平台域租户分页列表
- `GET /api/admin/platform/tenant-menus`：平台域租户统一菜单池
- `GET /api/admin/platform/tenants/:id`：平台域租户详情
- `GET /api/admin/platform/tenants/:id/menus`：平台域查询某租户已授权菜单
- `POST /api/admin/platform/tenants/:id/menus/save`：平台域保存某租户菜单授权，Body：`{ "permissionCodes": ["tenant:inventory:list"] }`
- `POST /api/admin/platform/tenants/:id/lifecycle`：平台域更新租户生命周期，Body：`{ "lifecycleStatus": "pending|active|rejected|disabled|expired", "expiresAt": null, "auditRemark": "...", "disabledReason": "..." }`
- `POST /api/admin/platform/tenants/:id/approve`：审核通过租户，审核后租户管理员可登录
- `POST /api/admin/platform/tenants/:id/reject`：驳回并禁用租户
- `GET /api/admin/platform/permissions`：平台域权限列表
- `GET /api/admin/platform/menus`：平台域菜单列表
- `POST /api/admin/platform/menus/list`：平台域菜单分页列表，Body：`{ "page": 1, "pageSize": 20, "type": "all|DIRECTORY|MENU|BUTTON", "name": "", "code": "", "routePath": "", "isHidden": -1 }`，`isHidden=-1` 表示全部
- `GET /api/admin/platform/menus/tree`：平台域菜单树，用于前端树形预览和菜单层级维护
- `GET /api/admin/platform/menus/:id`：平台域菜单详情
- `POST /api/admin/platform/menus/save`：平台域保存平台菜单，支持 `type/code/name/routePath/componentPath/parentId/icon/sortOrder/isHidden/isActive/description`，`type` 可选 `DIRECTORY` 目录、`MENU` 菜单、`BUTTON` 按钮
- `POST /api/admin/platform/menus/:id/delete`：平台域删除平台菜单；存在子菜单或平台角色绑定时会拒绝删除
- `GET /api/admin/platform/roles`：平台域角色列表
- `POST /api/admin/platform/roles/save`：平台域保存角色，可绑定平台菜单/按钮权限和 `dataScope/deptIds`
- `POST /api/admin/platform/users/list`：平台域平台用户分页列表
- `GET /api/admin/platform/users/:id`：平台域平台用户详情
- `POST /api/admin/platform/users/save`：平台域保存平台用户，可绑定平台角色、平台部门和平台岗位；新建时必须传 `password`
- `POST /api/admin/platform/users/:id/status`：平台域平台用户启用/禁用
- `POST /api/admin/platform/audit-logs`：平台操作审计分页，Body：`{ "page": 1, "pageSize": 20, "module": "", "username": "" }`
- `GET /api/admin/tenant/meta`：管理端租户域 API 边界信息
- `GET /api/admin/tenant/dashboard`：租户工作台，返回员工数、角色数、已授权菜单数、操作日志数
- `GET /api/admin/tenant/menus`：租户域当前租户已授权菜单，租户角色授权页使用
- `GET /api/admin/tenant/profile`：当前租户企业资料
- `POST /api/admin/tenant/profile/save`：当前租户保存企业资料
- `POST /api/admin/tenant/audit-logs`：当前租户操作日志分页，Body：`{ "page": 1, "pageSize": 20, "module": "", "username": "" }`
- `GET /api/dicts/options?type=INDUSTRY`（Public）：公开字典选项，只返回平台标准字典；如传 `tenantId` 会合并该租户自定义字典
- `GET /api/dicts/list?type=INDUSTRY&scope=platform`：字典分页。平台用户维护平台标准字典，租户用户只返回本租户字典
- `POST /api/dicts/save`：保存字典项。平台支持 `scope/isSystem/allowTenantExtend/allowTenantOverride`，租户只能保存本租户自定义字典
- `POST /api/dicts/update`：更新字典项
- `POST /api/dicts/delete`：删除字典项，系统内置字典不可删除
- `GET /api/dicts/types`：当前登录身份可管理的字典类型
- `GET /api/departments/list?deptName=&isActive=-1`：当前租户部门列表
- `GET /api/departments/tree?deptName=&isActive=-1`：当前租户部门树
- `GET /api/departments/options`：当前租户启用部门下拉树
- `POST /api/departments/save`：新增/更新部门，Body 支持 `id/parentId/deptCode/deptName/orderNum/leader/phone/email/isActive`
- `POST /api/departments/delete`：删除部门，Body：`{ "id": "" }`，存在下级部门时拒绝删除
- `GET /api/posts/page?postCode=&postName=&isActive=-1&page=1&pageSize=20`：当前租户岗位分页列表
- `GET /api/posts/options`：当前租户启用岗位下拉列表
- `POST /api/posts/save`：新增/更新岗位，Body 支持 `id/postCode/postName/postSort/isActive/remark`
- `POST /api/posts/delete`：删除岗位，Body：`{ "id": "" }`
- `GET /api/portal/config`：网站配置
- `PATCH /api/portal/config`：更新网站配置
- `GET /api/portal/inquiries`：访客询盘分页

公开端（Public）：
- `GET /api/portal/:domain/init`：门户初始化数据
- `GET /api/portal/:domain/products/:id`：门户产品详情
- `POST /api/portal/:domain/inquiry`：提交询盘

### 4.12 小程序 Miniapp

- `GET /api/miniapp/meta`（Public）：小程序 API 边界信息

### 4.13 公开产品/企业接口

- `GET /api/open/v1/meta`（Public）：Open API 边界信息
- `POST /api/products/public/page`（Public）：公开产品列表，仅返回白名单字段
- `POST /api/products/public/detail`（Public）：公开产品详情，仅返回白名单字段
- `POST /api/tenants/public/list`（Public）：公开企业列表，仅返回启用且审核通过企业
- `POST /api/tenants/public/detail`（Public）：公开企业详情，仅返回启用且审核通过企业

说明：Open API 签名能力代码暂时保留，但当前 public 产品/企业接口不启用签名校验。前端可直接请求，后端仍保留字段白名单、状态过滤和审计日志。

### 4.14 通知 Notifications

- `GET /api/notifications/subscribe`（Public）：SSE 订阅（需在 Header/Cookie 传 token，接口内校验）
- `POST /api/notifications/send`：广播通知
- `POST /api/notifications/send-to-users`：按用户推送
- `POST /api/notifications/send-to-role`：按角色推送（当前用户列表查询为 TODO）
- `POST /api/notifications/list`：通知列表
- `POST /api/notifications/read`：标记已读
- `GET /api/notifications/unread-count`：未读统计
- `GET /api/notifications/stats`：连接统计
- `POST /api/notifications/public/consultation`（Public）：公开咨询并触发通知

### 4.15 上传 Upload

- `POST /api/upload/fileList`：登录态多文件上传，`multipart/form-data` 字段名 `file`，最多 6 个，单文件最大 5MB。必须携带 `Authorization: Bearer <token>`，支持目录前缀 `avatar/product/tenant/portal/miniapp/image`。
- `POST /api/upload/public/fileList`（Public）：官网访客附件上传，`multipart/form-data` 字段名 `file`，最多 6 个，单文件最大 5MB，固定上传到 `portal/inquiry`，带限流。

### 4.16 短信 SMS

- `GET /api/send/sendSMS?phone=...`（Public）：发送短信验证码

## 5. 建议的后续维护方式

- 新增/修改接口后，同步更新本文件。
- 对外联调优先使用 Swagger：`/api-docs`。
