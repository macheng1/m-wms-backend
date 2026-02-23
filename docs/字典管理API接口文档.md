# 字典管理 API 接口文档

## 概述

字典管理模块提供系统数据字典功能，支持多租户架构，为前端 Select 组件提供标准化的下拉选项数据。

**基础路径**: `/dicts`

---

## 1. 获取字典选项

### 接口信息

| 项目 | 说明 |
|------|------|
| 接口路径 | `/dicts/options` |
| 请求方法 | `GET` |
| 是否需要认证 | 否 (@Public装饰器) |
| 响应头 | `Cache-Control: no-store` (禁用缓存) |

### 请求参数 (Query参数)

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `type` | string | 是 | 字典类型 | `INDUSTRY` |

### 请求示例

```http
GET /api/dicts/options?type=INDUSTRY
```

### 响应示例

**成功响应** (HTTP 200):

```json
{
  "code": 200,
  "message": "请求成功",
  "data": [
    {
      "label": "金属制品业 (不锈钢、引出棒、紧固件)",
      "value": "C33",
      "id": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "label": "电气机械和器材制造 (电热元件、电加热管)",
      "value": "C38",
      "id": "550e8400-e29b-41d4-a716-446655440001"
    },
    {
      "label": "通用设备制造业 (数控机床、机械零部件)",
      "value": "C34",
      "id": "550e8400-e29b-41d4-a716-446655440002"
    }
  ]
}
```

### 业务逻辑

1. 根据类型查询字典项，过滤条件：`type = ? AND isActive = 1`
2. 租户用户会额外加上 `tenantId` 条件进行数据隔离
3. 按 `sort` 字段升序排序
4. 返回 `{label, value, id}` 格式，直接适配前端 Select 组件

### 常见字典类型

| 类型代码 | 说明 |
|----------|------|
| `INDUSTRY` | 行业分类 |
| `UNIT` | 计量单位 |
| `MATERIAL` | 材质类型 |

---

## 2. 保存字典项

### 接口信息

| 项目 | 说明 |
|------|------|
| 接口路径 | `/dicts/save` |
| 请求方法 | `POST` |
| 是否需要认证 | 是 |
| Content-Type | `application/json` |

### 请求参数 (SaveDictDto)

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `id` | string | 否 | 字典项ID（更新时提供） | `"550e8400-..."` |
| `type` | string | 是 | 字典类型 | `"INDUSTRY"` |
| `label` | string | 是 | 展示名称 | `"金属制品业"` |
| `value` | string | 是 | 实际存值 | `"C33"` |
| `sort` | number | 否 | 排序（默认0） | `1` |

### 请求示例

```json
{
  "type": "INDUSTRY",
  "label": "金属制品业 (不锈钢、引出棒、紧固件)",
  "value": "C33",
  "sort": 1
}
```

### 响应示例

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "INDUSTRY",
    "label": "金属制品业 (不锈钢、引出棒、紧固件)",
    "value": "C33",
    "sort": 1,
    "isActive": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 业务逻辑

1. 自动关联当前用户的租户ID（租户数据隔离）
2. 平台管理员创建的字典项 `tenantId` 为 `null`（全局字典）
3. 默认 `isActive = 1`

---

## 3. 更新字典项

### 接口信息

| 项目 | 说明 |
|------|------|
| 接口路径 | `/dicts/update` |
| 请求方法 | `POST` |
| 是否需要认证 | 是 |
| Content-Type | `application/json` |

### 请求参数 (UpdateDictDto)

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `id` | string | 是 | 字典项ID | `"550e8400-..."` |
| `type` | string | 否 | 字典类型 | `"INDUSTRY"` |
| `label` | string | 否 | 展示名称 | `"金属制品业"` |
| `value` | string | 否 | 实际存值 | `"C33"` |
| `sort` | number | 否 | 排序 | `1` |
| `isActive` | number | 否 | 状态（1启用/0禁用） | `1` |

### 请求示例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "label": "金属制品业 (更新)",
  "sort": 10
}
```

### 响应示例

**成功响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "INDUSTRY",
    "label": "金属制品业 (更新)",
    "value": "C33",
    "sort": 10,
    "isActive": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**失败响应**:

```json
{
  "code": 409,
  "message": "字典项不存在或无权修改"
}
```

### 业务逻辑

1. 验证记录是否存在且属于当前租户
2. 只更新提供的字段
3. 返回更新后的完整数据

---

## 4. 删除字典项

### 接口信息

| 项目 | 说明 |
|------|------|
| 接口路径 | `/dicts/delete` |
| 请求方法 | `POST` |
| 是否需要认证 | 是 |
| Content-Type | `application/json` |

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `id` | string | 是 | 字典项ID |

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
    "raw": [],
    "affected": 1
  }
}
```

### 业务逻辑

1. 支持租户数据隔离，只能删除属于当前租户的字典项
2. 物理删除（非软删除）

---

## 数据模型

### Dictionary 实体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (UUID) | 自动 | 主键 |
| `tenantId` | string (UUID) | 自动 | 租户ID（平台管理员为null） |
| `type` | string | 是 | 字典类型（如 INDUSTRY, UNIT, MATERIAL） |
| `label` | string | 是 | 展示名称（前端label） |
| `value` | string | 是 | 实际存值（前端value） |
| `sort` | number | 是 | 排序（默认0） |
| `isActive` | tinyint | 是 | 状态（1启用/0禁用），默认1 |
| `createdAt` | datetime | 自动 | 创建时间 |
| `updatedAt` | datetime | 自动 | 更新时间 |
| `deletedAt` | datetime | 自动 | 删除时间（软删除） |

---

## 附录

### 1. 初始化字典数据

系统启动时自动初始化行业分类字典（INDUSTRY）：

| label | value | sort |
|-------|-------|------|
| 金属制品业 (不锈钢、引出棒、紧固件) | C33 | 1 |
| 电气机械和器材制造 (电热元件、电加热管) | C38 | 2 |
| 通用设备制造业 (数控机床、机械零部件) | C34 | 3 |
| 专用设备制造业 (纺织机械、印刷机械) | C35 | 4 |
| 汽车制造业 (汽车零部件) | C36 | 5 |
| 铁路、船舶、航空航天和其他运输设备制造业 | C37 | 6 |
| 计算机、通信和其他电子设备制造业 | C39 | 7 |
| 仪器仪表制造业 | C40 | 8 |

### 2. 租户数据隔离

- **平台管理员**：`tenantId = null`，可操作全局字典
- **租户用户**：`tenantId = 租户ID`，只能操作租户内字典

### 3. 前端使用示例

```javascript
// React Select 组件
const [industry, setIndustry] = useState([]);

// 获取字典选项
useEffect(() => {
  fetch('/api/dicts/options?type=INDUSTRY')
    .then(res => res.json())
    .then(data => setIndustry(data.data));
}, []);

// Select 组件使用
<Select
  options={industry}
  value={industry.find(item => item.value === form.industry)}
  onChange={(option) => setForm({...form, industry: option.value})}
/>
```

### 4. 常见错误码

| 错误码 | 说明 |
|--------|------|
| `400` | 请求参数验证失败 |
| `409` | 字典项不存在或无权修改 |
