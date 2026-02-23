# 第三方公开接口文档

本文档描述了供第三方调用的公开接口，无需登录或 Token 验证。

---

## 1. 租户列表

**接口地址**：`POST /tenants/public/list`

**请求头**：
```
Content-Type: application/json
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

**请求示例**：
```bash
curl -X POST http://your-domain/tenants/public/list \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "pageSize": 20}'
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "123456",
        "name": "示例租户",
        "status": 1
      }
    ],
    "total": 100
  }
}
```

---

## 2. 租户详情

**接口地址**：`POST /tenants/public/detail`

**请求头**：
```
Content-Type: application/json
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 租户ID |

**请求示例**：
```bash
curl -X POST http://your-domain/tenants/public/detail \
  -H "Content-Type: application/json" \
  -d '{"id": "123456"}'
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "123456",
    "name": "示例租户",
    "code": "tenant001",
    "status": 1,
    "contact": "张三",
    "phone": "13800138000"
  }
}
```

---

## 3. 产品列表

**接口地址**：`POST /products/public/page`

**请求头**：
```
Content-Type: application/json
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tenantId | string | 是 | 租户ID |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |
| keyword | string | 否 | 搜索关键词 |
| categoryCode | string | 否 | 类目编码 |

**请求示例**：
```bash
curl -X POST http://your-domain/products/public/page \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "123456",
    "page": 1,
    "pageSize": 20
  }'
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "prod_123",
        "name": "示例产品",
        "code": "SKU001",
        "categoryCode": "CAT001"
      }
    ],
    "total": 50
  }
}
```

---

## 4. 产品详情

**接口地址**：`POST /products/public/detail`

**请求头**：
```
Content-Type: application/json
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 产品ID |
| tenantId | string | 是 | 租户ID |

**请求示例**：
```bash
curl -X POST http://your-domain/products/public/detail \
  -H "Content-Type: application/json" \
  -d '{
    "id": "prod_123",
    "tenantId": "123456"
  }'
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "prod_123",
    "name": "示例产品",
    "code": "SKU001",
    "categoryCode": "CAT001",
    "description": "产品描述",
    "attributes": [
      {
        "name": "颜色",
        "value": "红色"
      }
    ]
  }
}
```

---

---

## 5. 提交咨询

**接口地址**：`POST /notifications/public/consultation`

**功能说明**：供官网等公开场景使用，接收访客咨询并实时通知客服人员

**请求头**：
```
Content-Type: application/json
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tenantId | string | 是 | 租户ID |
| name | string | 是 | 咨询人姓名 |
| phone | string | 是 | 联系电话 |
| email | string | 否 | 联系邮箱 |
| company | string | 否 | 公司名称 |
| consultationType | string | 否 | 咨询类型：PRODUCT/PRICE/COOPERATION/OTHER |
| message | string | 是 | 咨询内容 |
| productSku | string | 否 | 产品SKU（咨询特定产品时） |
| productName | string | 否 | 产品名称 |
| source | string | 否 | 来源渠道，默认"官网" |

**请求示例**：
```bash
curl -X POST http://your-domain/notifications/public/consultation \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "123456",
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@example.com",
    "company": "某某科技有限公司",
    "consultationType": "PRODUCT",
    "message": "我想咨询一下产品A的价格和规格",
    "productSku": "SKU-001",
    "productName": "产品A"
  }'
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "consult-1704067200000-abc123xyz",
    "message": "咨询已提交，我们会尽快与您联系",
    "expectedResponseTime": "工作时间内2小时内"
  }
}
```

---

## 注意事项

1. **无需验证**：以上接口均为公开接口，无需登录或 Token 验证
2. **租户隔离**：产品相关接口必须传入 `tenantId` 进行数据隔离
3. **实时通知**：咨询提交后会通过 SSE 实时推送给在线客服
4. **错误处理**：请求失败时会返回标准的错误响应
