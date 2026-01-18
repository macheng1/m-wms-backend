# M-WMS Backend API 接口文档

> 本文档基于 NestJS 框架的多租户仓储管理系统后端项目自动生成
> 生成时间: 2026-01-15

## 目录

- [项目概述](#项目概述)
- [认证说明](#认证说明)
- [接口模块](#接口模块)
  - [认证模块 (Auth)](#认证模块-auth)
  - [用户管理 (Users)](#用户管理-users)
  - [租户管理 (Tenants)](#租户管理-tenants)
  - [角色管理 (Roles)](#角色管理-roles)
  - [产品管理 (Products)](#产品管理-products)
  - [产品属性 (Attributes)](#产品属性-attributes)
  - [产品分类 (Categories)](#产品分类-categories)
  - [规格值管理 (Options)](#规格值管理-options)
  - [库存管理 (Inventory)](#库存管理-inventory)
  - [订单管理 (Orders)](#订单管理-orders)
  - [门户接口 (Portal)](#门户接口-portal)
  - [文件上传 (Upload)](#文件上传-upload)
  - [健康检查 (Health)](#健康检查-health)

---

## 项目概述

### 技术栈
- **框架**: NestJS (Node.js TypeScript)
- **数据库**: MySQL + TypeORM
- **认证**: JWT + Passport.js
- **API文档**: Swagger/OpenAPI
- **验证**: class-validator + class-transformer

### 基础路径
全局 API 前缀通过环境配置设置，通常为 `/api`

---

## 认证说明

### JWT 认证
大多数接口需要在请求头中携带 JWT Token：

```http
Authorization: Bearer <token>
```

### 公开接口
以下接口无需认证即可访问：
- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册
- `POST /tenants/onboard` - 租户入驻
- `POST /upload/fileList` - 文件上传
- `/portal/*` - 门户相关接口

---

## 接口模块

## 认证模块 (Auth)

**控制器**: `src/modules/auth/auth.controller.ts`

### 用户登录
```http
POST /auth/login
```

**描述**: 支持账号密码登录，成功后返回 JWT

**是否需要认证**: 否 (`@Public()`)

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**: JWT Token

---

### 用户注册
```http
POST /auth/register
```

**描述**: 用户注册

**是否需要认证**: 是

**请求体**:
```json
{
  "username": "string",
  "password": "string",
  "email": "string"
}
```

---

## 用户管理 (Users)

**控制器**: `src/modules/users/users.controller.ts`
**标签**: `@ApiTags('用户管理')`
**认证**: `@ApiBearerAuth()`

### 获取当前用户信息
```http
GET /users/getUserInfo
```

**描述**: 通过 Token 识别身份，返回用户画像、所属租户及权限 Code 列表

**是否需要认证**: 是

**响应头**:
```http
Cache-Control: no-cache, no-store, must-revalidate
```

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "id": "string",
    "username": "string",
    "email": "string",
    "tenantId": "string",
    "roles": ["string"],
    "permissions": ["string"]
  }
}
```

---

### 分页获取用户列表
```http
GET /users/page
```

**描述**: 分页查找员工列表

**是否需要认证**: 是

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| username | string | 否 | 用户名模糊搜索 |

---

### 保存用户
```http
POST /users/save
```

**描述**: 新增员工保存

**是否需要认证**: 是

**请求体**:
```json
{
  "username": "string",
  "password": "string",
  "email": "string",
  "roleId": "string"
}
```

---

### 更新用户
```http
POST /users/update
```

**描述**: 员工信息更新

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "roleId": "string"
}
```

---

### 个人修改密码
```http
POST /users/password
```

**描述**: 员工自主修改密码 (个人中心使用)

**是否需要认证**: 是

**请求体**:
```json
{
  "oldPassword": "string",
  "newPassword": "string"
}
```

---

### 管理员重置密码
```http
POST /users/reset
```

**描述**: 管理员强制重置密码 (员工管理页面使用)

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string",
  "newPassword": "string"
}
```

---

### 切换用户状态
```http
POST /users/status
```

**描述**: 员工状态切换

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string",
  "isActive": "number"
}
```

---

### 删除用户
```http
POST /users/delete
```

**描述**: 删除员工

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string"
}
```

---

### 获取用户详情
```http
POST /users/detail
```

**描述**: 获取指定员工详情

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string"
}
```

---

## 租户管理 (Tenants)

**控制器**: `src/modules/tenant/tenant.controller.ts`
**标签**: `@ApiTags('租户管理 (SaaS)')`

### 租户入驻
```http
POST /tenants/onboard
```

**描述**: 新工厂/租户入驻，返回生成的租户及管理员信息

**是否需要认证**: 否 (`@Public()`)

**请求体**:
```json
{
  "name": "string",
  "domain": "string",
  "adminUsername": "string",
  "adminPassword": "string",
  "adminEmail": "string"
}
```

---

### 分页查询租户列表
```http
POST /tenants/list
```

**描述**: 分页查询租户列表

**是否需要认证**: 是

**请求体**:
```json
{
  "page": 1,
  "pageSize": 20
}
```

---

### 获取租户详情
```http
POST /tenants/detail
```

**描述**: 获取租户详情

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string"
}
```

---

### 修改租户信息
```http
PATCH /tenants/:id
```

**描述**: 修改租户信息

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 租户ID |

**请求体**: 租户更新信息

---

### 删除租户
```http
DELETE /tenants/:id
```

**描述**: 删除租户

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 租户ID |

---

## 角色管理 (Roles)

**控制器**: `src/modules/roles/roles.controller.ts`
**标签**: `@ApiTags('角色管理')`

### 创建角色
```http
POST /roles
```

**描述**: 创建新角色

**是否需要认证**: 是

**请求体**:
```json
{
  "name": "string",
  "code": "string",
  "description": "string",
  "permissions": ["string"]
}
```

---

### 分页获取角色列表
```http
GET /roles
```

**描述**: 分页查找所有角色

**是否需要认证**: 是

**响应头**:
```http
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| name | string | 否 | 角色名模糊搜索 |

---

### 获取角色详情
```http
GET /roles/:id
```

**描述**: 获取指定角色详情

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 角色ID |

---

### 更新角色
```http
POST /roles/:id/update
```

**描述**: 更新角色信息

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 角色ID |

**请求体**:
```json
{
  "name": "string",
  "code": "string",
  "description": "string",
  "permissions": ["string"]
}
```

---

### 删除角色
```http
DELETE /roles/:id
```

**描述**: 删除角色

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 角色ID |

---

### 更新角色状态
```http
POST /roles/:id/status
```

**描述**: 更新角色启用/禁用状态

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 角色ID |

**请求体**:
```json
{
  "isActive": "number"
}
```

---

### 获取激活角色列表
```http
POST /roles/selectRoleLists
```

**描述**: 查询所有激活的角色（不分页，用于下拉选择）

**是否需要认证**: 是

---

## 产品管理 (Products)

**控制器**: `src/modules/product/product.controller.ts`

### 保存产品
```http
POST /products/save
```

**描述**: 保存产品（新增或更新）

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string",
  "name": "string",
  "sku": "string",
  "categoryId": "string",
  "price": "number",
  "cost": "number",
  "description": "string",
  "images": ["string"],
  "attributes": {},
  "isActive": "number"
}
```

---

### 更新产品
```http
POST /products/update
```

**描述**: 更新产品信息

**是否需要认证**: 是

**请求体**: 同保存产品

---

### 分页获取产品列表
```http
GET /products/page
```

**描述**: 分页查询产品列表

**是否需要认证**: 是

**响应头**:
```http
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| name | string | 否 | 产品名称搜索 |
| categoryId | string | 否 | 分类ID筛选 |
| sku | string | 否 | SKU搜索 |

---

### 获取产品详情
```http
GET /products/detail
```

**描述**: 获取产品详情

**是否需要认证**: 是

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | string | 是 | 产品ID |

---

### 更新产品状态
```http
POST /products/status
```

**描述**: 修改产品状态（启用/禁用）

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string",
  "isActive": "number"
}
```

---

### 删除产品
```http
POST /products/delete
```

**描述**: 删除产品

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string"
}
```

---

## 产品属性 (Attributes)

**控制器**: `src/modules/product/controller/attributes.controller.ts`
**标签**: `@ApiTags('产品管理-属性管理')`

### 分页获取属性列表
```http
GET /attributes/page
```

**描述**: 分页查询产品属性列表

**是否需要认证**: 是

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| name | string | 否 | 属性名搜索 |

---

### 保存属性
```http
POST /attributes/save
```

**描述**: 保存产品属性

**是否需要认证**: 是

**请求体**:
```json
{
  "name": "string",
  "code": "string",
  "type": "string",
  "isRequired": "boolean",
  "options": ["string"]
}
```

---

### 更新属性
```http
POST /attributes/update
```

**描述**: 更新产品属性

**是否需要认证**: 是

**请求体**: 同保存属性（包含 id）

---

### 获取属性详情
```http
GET /attributes/detail
```

**描述**: 获取属性详情

**是否需要认证**: 是

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | string | 是 | 属性ID |

---

### 删除属性
```http
POST /attributes/delete
```

**描述**: 删除属性

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string"
}
```

---

### 更新属性状态
```http
POST /attributes/status
```

**描述**: 更新属性状态（启用/禁用）

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string",
  "isActive": "number"
}
```

---

## 产品分类 (Categories)

**控制器**: `src/modules/product/controller/categories.controller.ts`

### 保存分类
```http
POST /categories/save
```

**描述**: 保存产品分类

**是否需要认证**: 是

**请求体**:
```json
{
  "name": "string",
  "parentId": "string",
  "level": "number",
  "sort": "number",
  "icon": "string"
}
```

---

### 分页获取分类列表
```http
GET /categories/page
```

**描述**: 分页查询产品分类列表

**是否需要认证**: 是

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| name | string | 否 | 分类名搜索 |

---

### 获取分类详情
```http
GET /categories/detail
```

**描述**: 获取分类详情

**是否需要认证**: 是

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | string | 是 | 分类ID |

---

### 更新分类状态
```http
POST /categories/status
```

**描述**: 更新分类状态（启用/禁用）

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string",
  "isActive": "number"
}
```

---

### 更新分类
```http
POST /categories/update
```

**描述**: 更新分类信息

**是否需要认证**: 是

**请求体**: 同保存分类（包含 id）

---

### 删除分类
```http
POST /categories/delete
```

**描述**: 删除分类

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string"
}
```

---

## 规格值管理 (Options)

**控制器**: `src/modules/product/controller/attribute-options.controller.ts`
**标签**: `@ApiTags('产品管理-规格值管理')`
**认证**: `@UseGuards(JwtAuthGuard)`

### 分页获取规格值列表
```http
GET /options/page
```

**描述**: 分页查询规格值列表

**是否需要认证**: 是

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| name | string | 否 | 规格值名称搜索 |

---

### 保存规格值
```http
POST /options/save
```

**描述**: 保存规格值

**是否需要认证**: 是

**请求体**:
```json
{
  "attributeId": "string",
  "value": "string",
  "color": "string",
  "image": "string",
  "sort": "number"
}
```

---

### 更新规格值
```http
POST /options/update
```

**描述**: 更新规格值

**是否需要认证**: 是

**请求体**: 同保存规格值（包含 id）

---

### 获取规格值详情
```http
GET /options/detail
```

**描述**: 获取规格值详情

**是否需要认证**: 是

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| id | string | 是 | 规格值ID |

---

### 删除规格值
```http
POST /options/delete
```

**描述**: 删除规格值

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string"
}
```

---

### 更新规格值状态
```http
POST /options/status
```

**描述**: 更改规格状态（启用/禁用）

**是否需要认证**: 是

**请求体**:
```json
{
  "id": "string",
  "isActive": "number"
}
```

---

## 库存管理 (Inventory)

**控制器**: `src/modules/inventory/inventory.controller.ts`

### 创建库存记录
```http
POST /inventory
```

**描述**: 创建库存记录

**是否需要认证**: 是

**请求体**:
```json
{
  "productId": "string",
  "quantity": "number",
  "warehouseId": "string",
  "location": "string"
}
```

---

### 获取库存列表
```http
GET /inventory
```

**描述**: 获取当前租户的所有库存记录

**是否需要认证**: 是

---

### 获取库存详情
```http
GET /inventory/:id
```

**描述**: 获取指定库存详情

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 库存ID |

---

### 更新库存
```http
PATCH /inventory/:id
```

**描述**: 更新库存信息

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 库存ID |

**请求体**:
```json
{
  "quantity": "number",
  "location": "string"
}
```

---

### 删除库存
```http
DELETE /inventory/:id
```

**描述**: 删除库存记录

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 库存ID |

---

## 订单管理 (Orders)

**控制器**: `src/modules/order/order.controller.ts`

### 创建订单
```http
POST /orders
```

**描述**: 创建新订单

**是否需要认证**: 是

**请求体**:
```json
{
  "orderNo": "string",
  "customerId": "string",
  "items": [
    {
      "productId": "string",
      "quantity": "number",
      "price": "number"
    }
  ],
  "totalAmount": "number",
  "remark": "string"
}
```

---

### 获取订单列表
```http
GET /orders
```

**描述**: 获取当前租户的所有订单

**是否需要认证**: 是

---

### 获取订单详情
```http
GET /orders/:id
```

**描述**: 获取指定订单详情

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 订单ID |

---

### 更新订单
```http
PATCH /orders/:id
```

**描述**: 更新订单信息

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 订单ID |

**请求体**:
```json
{
  "status": "string",
  "remark": "string"
}
```

---

### 删除订单
```http
DELETE /orders/:id
```

**描述**: 删除订单

**是否需要认证**: 是

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| id | string | 订单ID |

---

## 门户接口 (Portal)

**控制器**: `src/modules/portal/portal.controller.ts`
**认证**: 全部公开 (`@Public()`)

### 官网初始化数据
```http
GET /portal/:domain/init
```

**描述**: 一次性获取配置、产品分类和产品

**是否需要认证**: 否

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| domain | string | 租户域名 |

---

### 产品详情（门户）
```http
GET /portal/:domain/products/:id
```

**描述**: 获取门户产品详情

**是否需要认证**: 否

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| domain | string | 租户域名 |
| id | string | 产品ID |

---

### 提交询盘/留言
```http
POST /portal/:domain/inquiry
```

**描述**: 访客提交询盘/留言

**是否需要认证**: 否

**路径参数**:
| 参数 | 类型 | 描述 |
|------|------|------|
| domain | string | 租户域名 |

**请求体**:
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "message": "string"
}
```

---

## 文件上传 (Upload)

**控制器**: `src/modules/upload/upload.controller.ts`
**标签**: `@ApiTags('上传图片')`
**认证**: 公开 (`@Public()`)

### 上传文件列表
```http
POST /upload/fileList
```

**描述**: 批量上传图片文件，最多支持6个文件

**是否需要认证**: 否

**Content-Type**: `multipart/form-data`

**请求参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| file | File[] | 是 | 文件数组（最多6个） |

**响应**: 返回上传成功的文件URL列表

---

## 健康检查 (Health)

**控制器**: `src/modules/health/health.controller.ts`

### 健康检查
```http
GET /health
```

**描述**: 服务健康状态检查

**是否需要认证**: 否

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

---

## 附录

### HTTP 状态码说明

| 状态码 | 描述 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或Token无效 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "statusCode": 400,
  "message": "错误信息描述",
  "error": "Bad Request"
}
```

### 统一响应格式

成功响应通常遵循以下格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

---

*文档生成时间: 2026-01-15*
