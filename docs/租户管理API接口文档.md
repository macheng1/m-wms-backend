# 租户管理 API 接口文档

## 概述

租户管理模块提供完整的 SaaS 多租户功能，支持工厂/企业入驻、租户信息管理、数据隔离等核心能力。

**基础路径**: `/tenants`

---

## 1. 工厂入驻 (租户注册)

### 接口信息

| 项目 | 说明 |
|------|------|
| 接口路径 | `/tenants/onboard` |
| 请求方法 | `POST` |
| 是否需要认证 | 否 (公开接口) |
| Content-Type | `application/json` |

### 请求参数 (CreateTenantDto)

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `code` | string | 否 | 企业唯一编码（用于登录/识别），如不填将自动生成 | `"XH001"` |
| `name` | string | 是 | 企业/工厂全称（唯一） | `"泰州兴华精密电子厂"` |
| `smsCode` | string | 是 | 手机验证码 | `"123456"` |
| `contactPhone` | string | 是 | 联系电话（需验证） | `"13800138000"` |
| `adminUser` | string | 是 | 初始管理员账号（最少4位） | `"admin"` |
| `adminPass` | string | 是 | 初始管理员密码（最少6位） | `"123456"` |
| `industry` | string | 否 | 行业标识 | `"heating_element"` |
| `contactPerson` | string | 否 | 工厂联系人 | `"张经理"` |
| `address` | string | 否 | 工厂详细地址 | `"江苏省泰州市海陵区xx路xx号"` |
| `factoryAddress` | string | 否 | 工厂地址（别名） | `"江苏省泰州市xx区xx路xx号"` |
| `registerAddress` | string | 否 | 公司注册地址 | `"江苏省泰州市xx区xx路xx号"` |
| `website` | string | 否 | 官网 | `"www.example.com"` |
| `remark` | string | 否 | 备注 | `"企业备注信息"` |
| `taxNo` | string | 否 | 税号 | `"9132xxxxxxxxxxxx"` |
| `taxpayerType` | string | 否 | 纳税人类型 | `"一般纳税人"` |
| `creditCode` | string | 否 | 统一社会信用代码 | `"9132xxxxxxxxxxxx"` |
| `bankName` | string | 否 | 开户行 | `"中国银行"` |
| `bankAccount` | string | 否 | 银行账号 | `"622202xxxxxxxxxx"` |
| `businessLicenseNo` | string | 否 | 营业执照号 | `"320xxxxxxx"` |
| `businessLicenseExpire` | Date | 否 | 营业执照有效期 | `"2030-12-31"` |
| `legalPerson` | string | 否 | 法人代表 | `"李四"` |
| `registeredCapital` | string | 否 | 注册资本 | `"1000万人民币"` |
| `industryType` | string | 否 | 行业分类 | `"制造业"` |
| `qualificationNo` | string | 否 | 资质证书编号 | `"A123456789"` |
| `qualificationExpire` | Date | 否 | 资质证书有效期 | `"2030-12-31"` |
| `email` | string | 否 | 联系邮箱 | `"test@example.com"` |
| `fax` | string | 否 | 传真 | `"0523-88888888"` |
| `foundDate` | Date | 否 | 成立日期 | `"2020-01-01"` |
| `staffCount` | number | 否 | 员工人数 | `100` |
| `mainProducts` | string | 否 | 主要产品 | `"加热管、加热圈"` |
| `annualCapacity` | string | 否 | 年产能 | `"100万件/年"` |
| `industryCode` | string | 否 | 所属行业代码 | `"A01"` |
| `industryName` | string | 否 | 所属行业名称 | `"电子制造业"` |

### 响应示例

**成功响应** (HTTP 200):

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "tenantId": "550e8400-e29b-41d4-a716-446655440000",
    "tenantCode": "XH001",
    "tenantName": "泰州兴华精密电子厂",
    "adminId": "550e8400-e29b-41d4-a716-446655440001",
    "username": "admin"
  }
}
```

### 业务逻辑

1. **预验证阶段**
   - 验证手机验证码是否正确且未过期
   - 检查企业名称是否已存在

2. **事务处理**
   - 创建租户主体（自动生成企业编码和官网地址）
   - 初始化角色权限（系统管理员、仓库主管、生产组长）
   - 创建超级管理员用户
   - 初始化基础数据（单位、产品类目、属性）
   - 初始化门户配置

3. **后续处理**
   - 删除已使用的验证码（防止重复使用）

### 错误码

| 错误码 | 说明 |
|--------|------|
| `400` | 验证码错误或已过期 |
| `409` | 企业名称已存在 |

---

## 2. 分页查询租户列表

### 接口信息

| 项目 | 说明 |
|------|------|
| 接口路径 | `/tenants/list` |
| 请求方法 | `POST` |
| 是否需要认证 | 是（需要管理员权限） |
| Content-Type | `application/json` |

### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| `page` | number | 否 | 页码 | `1` |
| `pageSize` | number | 否 | 每页数量 | `20` |

### 请求示例

```json
{
  "page": 1,
  "pageSize": 20
}
```

### 响应示例

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "code": "XH001",
        "name": "泰州兴华精密电子厂",
        "industryCode": "A01",
        "contactPerson": "张经理",
        "contactPhone": "13800138000",
        "address": "江苏省泰州市海陵区xx路xx号",
        "website": "https://dev.pinmalink.com/portal/xh001/zh",
        "isActive": 1,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 3. 获取租户详情

### 接口信息

| 项目 | 说明 |
|------|------|
| 接口路径 | `/tenants/detail` |
| 请求方法 | `POST` |
| 是否需要认证 | 是 |
| Content-Type | `application/json` |

### 请求参数 (DetailTenantDto)

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 租户ID（UUID格式） |

### 请求示例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 响应示例

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "XH001",
    "name": "泰州兴华精密电子厂",
    "industryCode": "A01",
    "industryName": "电子制造业",
    "contactPerson": "张经理",
    "contactPhone": "13800138000",
    "address": "江苏省泰州市海陵区xx路xx号",
    "factoryAddress": "江苏省泰州市xx区xx路xx号",
    "registerAddress": "江苏省泰州市xx区xx路xx号",
    "website": "https://dev.pinmalink.com/portal/xh001/zh",
    "remark": "企业备注信息",
    "taxNo": "9132xxxxxxxxxxxx",
    "taxpayerType": "一般纳税人",
    "creditCode": "9132xxxxxxxxxxxx",
    "bankName": "中国银行",
    "bankAccount": "622202xxxxxxxxxx",
    "businessLicenseNo": "320xxxxxxx",
    "businessLicenseExpire": "2030-12-31T00:00:00.000Z",
    "legalPerson": "李四",
    "registeredCapital": "1000万人民币",
    "industryType": "制造业",
    "qualificationNo": "A123456789",
    "qualificationExpire": "2030-12-31T00:00:00.000Z",
    "email": "test@example.com",
    "fax": "0523-88888888",
    "foundDate": "2020-01-01T00:00:00.000Z",
    "staffCount": 100,
    "mainProducts": "加热管、加热圈",
    "annualCapacity": "100万件/年",
    "isActive": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 4. 修改租户信息

### 接口信息

| 项目 | 说明 |
|------|------|
| 接口路径 | `/tenants/:id` |
| 请求方法 | `PATCH` |
| 是否需要认证 | 是 |
| Content-Type | `application/json` |

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 租户ID（UUID格式） |

### 请求参数 (UpdateTenantDto)

除 `id`、`code`、`createdAt`、`updatedAt` 外，所有租户实体字段均可更新。

### 请求示例

```json
{
  "name": "泰州兴华精密电子厂（更新）",
  "contactPerson": "王经理",
  "contactPhone": "13900139000",
  "staffCount": 150
}
```

### 响应示例

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "XH001",
    "name": "泰州兴华精密电子厂（更新）",
    "contactPerson": "王经理",
    "contactPhone": "13900139000",
    "staffCount": 150,
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

### 业务逻辑

1. 更新租户基本信息
2. 删除原门户配置
3. 根据新信息重新生成门户配置

---

## 5. 删除租户

### 接口信息

| 项目 | 说明 |
|------|------|
| 接口路径 | `/tenants/:id` |
| 请求方法 | `DELETE` |
| 是否需要认证 | 是（需要管理员权限） |
| Content-Type | `application/json` |

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 租户ID（UUID格式） |

### 响应示例

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "success": true
  }
}
```

---

## 数据模型

### Tenant 实体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (UUID) | 自动 | 主键 |
| `code` | string(50) | 是 | 企业唯一编码（唯一索引） |
| `name` | string | 是 | 企业/工厂全称（唯一） |
| `industryCode` | string(50) | 否 | 所属行业代码 |
| `contactPerson` | string | 否 | 联系人 |
| `contactPhone` | string | 否 | 联系电话 |
| `address` | text | 否 | 工厂详细地址 |
| `factoryAddress` | text | 否 | 工厂地址（别名） |
| `registerAddress` | text | 否 | 公司注册地址 |
| `website` | string | 否 | 官网 |
| `remark` | text | 否 | 备注 |
| `taxNo` | string(50) | 否 | 税号 |
| `taxpayerType` | string | 否 | 纳税人类型 |
| `creditCode` | string(100) | 否 | 统一社会信用代码 |
| `bankName` | string | 否 | 开户行 |
| `bankAccount` | string | 否 | 银行账号 |
| `businessLicenseNo` | string(100) | 否 | 营业执照号 |
| `businessLicenseExpire` | date | 否 | 营业执照有效期 |
| `legalPerson` | string | 否 | 法人代表 |
| `registeredCapital` | string | 否 | 注册资本 |
| `industryType` | string | 否 | 行业分类 |
| `qualificationNo` | string(100) | 否 | 资质证书编号 |
| `qualificationExpire` | date | 否 | 资质证书有效期 |
| `email` | string | 否 | 联系邮箱 |
| `fax` | string | 否 | 传真 |
| `foundDate` | date | 否 | 成立日期 |
| `staffCount` | int | 否 | 员工人数 |
| `mainProducts` | text | 否 | 主要产品 |
| `annualCapacity` | string | 否 | 年产能 |
| `isActive` | tinyint | 是 | 租户状态（1启用/0禁用），默认1 |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 更新时间 |
| `deletedAt` | datetime | 自动 | 删除时间（软删除） |

---

## 附录

### 1. 企业编码生成规则

当用户未提供 `code` 时，系统自动生成：

格式：`ENT_{企业简拼}_{4位随机码}`

示例：`ENT_TZXH_AB3D`

### 2. 官网地址生成规则

| 环境 | 格式 |
|------|------|
| 生产环境 | `https://pinmalink.com/portal/{code}/zh` |
| 开发环境 | `https://dev.pinmalink.com/portal/{code}/zh` |
| 测试环境 | `https://test.pinmalink.com/portal/{code}/zh` |

### 3. 默认初始化角色

| 角色代码 | 角色名称 | 说明 |
|----------|----------|------|
| `ADMIN` | 系统管理员 | 拥有所有权限 |
| `WH_MANAGER` | 仓库主管 | 仓库管理相关权限 |
| `PROD_LEADER` | 生产组长 | 库存管理相关权限 |

### 4. 默认初始化数据

- **基础单位**：个、件、箱、套、kg、g、吨、米、厘米等
- **产品类目**：默认类目结构
- **产品属性**：常用属性模板
- **门户配置**：基于企业信息的默认配置
