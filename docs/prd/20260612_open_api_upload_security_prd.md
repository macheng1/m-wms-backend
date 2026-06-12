# Open API 签名与上传安全优化 PRD（后端）

## 背景与目标

当前系统中存在两类安全边界需要收敛：

- `products/public/*`、`tenants/public/*` 标注为“第三方调用”，但此前只使用 `@Public()` 放行，调用方只要知道路径和参数即可访问。
- `upload/fileList` 此前为公开上传接口，缺少登录校验、文件大小、MIME 类型、扩展名和上传目录白名单约束。

本次优化目标：

- 第三方服务端调用接口必须携带签名，降低接口被匿名调用、重放调用和伪造调用的风险。
- 上传接口改为登录态接口，并增加文件类型、大小、数量和目录边界校验。
- 保持官网、小程序首页等普通公开展示接口不受影响。
- 给前端和第三方调用方提供清晰的联调规则。

## 分端场景与接口边界

当前系统至少有 4 类前端/客户端场景，接口安全策略不能混用。

| 场景 | 典型使用方 | 推荐接口边界 | 鉴权方式 | 是否使用 Open API 签名 |
| --- | --- | --- | --- | --- |
| 小程序 | 微信/抖音等小程序用户端 | `/api/miniapp/*` | 小程序登录态 JWT | 否 |
| App | 移动 App 用户端 | 建议独立 `/api/app/*`，当前如复用管理端接口则用 JWT | App 登录态 JWT | 否 |
| 网站管理端 | 管理后台、运营后台、租户后台 | `/api/admin/*` 或当前管理端业务接口 | 管理端 JWT + 后续 RBAC | 否 |
| 官网 | 企业官网、门户展示页 | `/api/portal/:domain/*` | 公开访问，按 domain 解析租户 | 否 |
| 第三方服务端调用 | 外部系统、服务端集成、BFF 转发 | `/api/*/public/*` 或后续 `/api/open/v1/*` | appKey + appSecret 签名 | 是 |

关键规则：

- 小程序、App、网站管理端属于“用户登录态调用”，使用 JWT，不使用 Open API appSecret。
- 官网属于“公开展示调用”，使用 domain 或公开路径解析租户，不要求 JWT，也不使用 Open API appSecret。
- 第三方服务端调用属于“系统对系统调用”，必须使用 Open API 签名。
- `OPEN_API_APP_SECRET` 只能存在服务端，不能放到小程序、App、官网前端或管理端浏览器代码里。
- 上传接口属于用户登录态能力，小程序/App/管理端如需上传，都应携带各自 JWT；官网访客不应直接调用通用上传接口。

### 各端本期影响

#### 小程序

不受 Open API 签名影响。小程序继续使用：

- `/api/miniapp/auth/login`
- `/api/miniapp/posts/*`
- `/api/miniapp/yellow-pages/*`
- `/api/miniapp/orders/*`

如小程序内需要上传图片，必须先登录并携带小程序 JWT 调用：

```http
POST /api/upload/fileList
Authorization: Bearer <miniapp_token>
```

推荐上传目录：

- `miniapp/post`
- `miniapp/banner`
- `avatar`

#### App

如果 App 是面向登录用户的业务端，建议后续独立 `/api/app/*` 接口边界。当前如果 App 复用管理端或小程序接口，应遵循对应 JWT 登录态。

App 不应使用 Open API appSecret。需要第三方数据时，应调用自己的服务端/BFF，由服务端/BFF 再签名访问本后端。

#### 网站管理端

网站管理端继续使用管理端 JWT。上传 Logo、产品图片、招聘图片、官网配置素材时，使用：

```http
POST /api/upload/fileList
Authorization: Bearer <admin_token>
```

推荐上传目录：

- `tenant/logo`
- `product`
- `portal/banner`
- `portal/job`
- `image`

网站管理端不需要 Open API 签名。

#### 官网

官网面向访客展示，继续使用公开门户接口：

- `/api/portal/:domain/init`
- `/api/portal/:domain/products/:id`
- `/api/portal/:domain/inquiry`

官网公开接口不使用 Open API 签名。官网访客提交询盘也不应直接调用通用上传接口；如后续要支持访客上传附件，需要单独设计官网附件上传接口，并加验证码、限流、文件安全策略。

#### 第三方服务端调用

只有外部系统服务端、BFF、后端任务等服务端调用场景使用 Open API 签名。本期覆盖：

- `POST /api/products/public/page`
- `POST /api/products/public/detail`
- `POST /api/tenants/public/list`
- `POST /api/tenants/public/detail`

前端页面如需要这些数据，不能在浏览器里计算签名，应请求自己的 BFF。

## 本期范围

### Open API 签名

本期对以下“第三方调用”接口启用签名守卫：

- `POST /api/products/public/page`
- `POST /api/products/public/detail`
- `POST /api/tenants/public/list`
- `POST /api/tenants/public/detail`

这些接口仍保留 `@Public()`，但会额外执行 `OpenApiSignatureGuard`。

### 上传接口安全

本期对以下接口调整：

- `POST /api/upload/fileList`

调整内容：

- 移除公开访问，改为依赖全局 JWT 登录态。
- 单次最多上传 6 个文件。
- 单文件最大 5MB。
- 只允许指定 MIME 类型和文件扩展名。
- 上传目录只允许指定业务前缀。
- 清理上传服务中的调试日志。

## 非本期范围

- 不新增 Open API 应用管理表。
- 不支持多 appKey、多租户独立 appSecret。
- 不做 IP 白名单。
- 不做接口级调用频率限制。
- 不调整普通官网、小程序公开展示接口。
- 不调整 OSS 存储策略、回源域名、图片压缩和病毒扫描。

以上能力建议后续作为 Open API 管理台和上传安全二期建设。

## 配置项

新增环境变量：

```env
OPEN_API_APP_KEY=your-app-key
OPEN_API_APP_SECRET=your-app-secret
OPEN_API_SIGN_WINDOW_SECONDS=300
```

说明：

- `OPEN_API_APP_KEY`：第三方调用方使用的应用标识。
- `OPEN_API_APP_SECRET`：服务端签名密钥，只能保存在后端、BFF 或第三方服务端，不能下发到浏览器、小程序或 App 客户端。
- `OPEN_API_SIGN_WINDOW_SECONDS`：签名有效窗口，默认 300 秒。

如果 `OPEN_API_APP_KEY` 或 `OPEN_API_APP_SECRET` 未配置，受签名保护的接口会返回“Open API 签名配置未启用”。

## Open API 签名规则

### 请求头

第三方调用必须携带以下 Header：

```http
x-app-key: your-app-key
x-timestamp: 1781234567890
x-nonce: random-string
x-signature: hmac-sha256-signature
```

字段说明：

- `x-app-key`：应用标识，必须等于后端配置的 `OPEN_API_APP_KEY`。
- `x-timestamp`：毫秒时间戳，例如 `Date.now()`，必须在有效时间窗口内。
- `x-nonce`：随机字符串，同一个 appKey 在有效时间窗口内不可重复。
- `x-signature`：按签名算法生成的 HMAC-SHA256 十六进制字符串。

### 签名原文

签名原文由 5 行组成，使用 `\n` 连接：

```text
METHOD
PATH
TIMESTAMP
NONCE
SHA256(canonicalJson(body))
```

字段说明：

- `METHOD`：HTTP 方法大写，例如 `POST`。
- `PATH`：请求路径，不包含 query string。注意要包含全局前缀，例如 `/api/products/public/page`。
- `TIMESTAMP`：与请求头 `x-timestamp` 完全一致。
- `NONCE`：与请求头 `x-nonce` 完全一致。
- `SHA256(canonicalJson(body))`：请求体规范化 JSON 后计算 SHA256。

### canonicalJson 规则

后端规则：

- 基础类型使用 `JSON.stringify(value)`。
- 数组保持原顺序，逐项递归规范化。
- 对象按 key 字典序升序排序，再逐项递归规范化。

示例请求体：

```json
{
  "tenantId": "tenant-001",
  "pageSize": 20,
  "page": 1
}
```

规范化后：

```json
{"page":1,"pageSize":20,"tenantId":"tenant-001"}
```

### 签名计算示例

签名原文示例：

```text
POST
/api/products/public/page
1781234567890
9b95b8b66f0d4f25
4b7f2d0c0c4f...
```

签名：

```text
HMAC-SHA256(appSecret, signPayload)
```

输出格式为 hex。

### 防重放规则

- 时间戳必须在 `OPEN_API_SIGN_WINDOW_SECONDS` 范围内。
- 签名校验通过后，后端会用 Redis 写入 `open-api:nonce:{appKey}:{nonce}`。
- 同一 `appKey + nonce` 在有效窗口内重复使用会被拒绝。
- nonce 写入使用 Redis `SET NX EX`，避免并发重复提交绕过校验。

## Open API 接口契约

### 产品列表

```http
POST /api/products/public/page
```

请求体：

```json
{
  "tenantId": "tenant-uuid",
  "page": 1,
  "pageSize": 20,
  "name": "产品关键字"
}
```

权限：

- 需要 Open API 签名。
- 不需要 JWT。

### 产品详情

```http
POST /api/products/public/detail
```

请求体：

```json
{
  "tenantId": "tenant-uuid",
  "id": "product-uuid"
}
```

权限：

- 需要 Open API 签名。
- 不需要 JWT。

### 租户列表

```http
POST /api/tenants/public/list
```

请求体：

```json
{
  "page": 1,
  "pageSize": 20,
  "tenantSource": "all"
}
```

权限：

- 需要 Open API 签名。
- 不需要 JWT。

### 租户详情

```http
POST /api/tenants/public/detail
```

请求体：

```json
{
  "id": "tenant-uuid"
}
```

权限：

- 需要 Open API 签名。
- 不需要 JWT。

## 前端/第三方如何使用 Open API

### 重要安全约束

浏览器前端、小程序和 App 客户端不允许保存 `OPEN_API_APP_SECRET`。

推荐调用方式：

- 第三方服务端直接调用本后端，签名在第三方服务端生成。
- 前端页面调用自己的 BFF，由 BFF 生成签名后转发到本后端。
- 如果是官网、小程序展示场景，优先继续使用已有普通公开展示接口，不要为了展示数据把 appSecret 放到前端。

### Node.js 签名示例

```ts
import crypto from 'crypto';

function canonicalJson(value: any): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

function signOpenApi(params: {
  method: string;
  path: string;
  body: any;
  appSecret: string;
}) {
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(16).toString('hex');
  const bodyHash = crypto.createHash('sha256').update(canonicalJson(params.body || {})).digest('hex');
  const payload = [
    params.method.toUpperCase(),
    params.path,
    timestamp,
    nonce,
    bodyHash,
  ].join('\n');

  const signature = crypto.createHmac('sha256', params.appSecret).update(payload).digest('hex');

  return {
    timestamp,
    nonce,
    signature,
  };
}
```

### Node.js 调用示例

```ts
const appKey = process.env.OPEN_API_APP_KEY!;
const appSecret = process.env.OPEN_API_APP_SECRET!;
const path = '/api/products/public/page';
const body = {
  tenantId: 'tenant-uuid',
  page: 1,
  pageSize: 20,
};

const { timestamp, nonce, signature } = signOpenApi({
  method: 'POST',
  path,
  body,
  appSecret,
});

const response = await fetch(`https://api.example.com${path}`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-app-key': appKey,
    'x-timestamp': timestamp,
    'x-nonce': nonce,
    'x-signature': signature,
  },
  body: JSON.stringify(body),
});

const result = await response.json();
```

### 常见错误

- `Open API 签名参数缺失`：缺少必要 Header。
- `Open API appKey 无效`：`x-app-key` 与后端配置不一致。
- `Open API timestamp 无效`：时间戳不是有效数字。
- `Open API 签名已过期`：客户端或服务端时间差超过有效窗口。
- `Open API 签名错误`：签名原文、路径、body、secret 不一致。
- `Open API nonce 已使用`：同一 nonce 被重复使用。
- `Open API 签名配置未启用`：后端未配置 appKey 或 appSecret。

## 上传接口契约

### 批量上传文件

```http
POST /api/upload/fileList
Content-Type: multipart/form-data
Authorization: Bearer <access_token>
```

表单字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | file[] | 是 | 文件数组，最多 6 个 |
| `path` | string | 否 | 上传目录，不传默认 `image` |

允许上传目录前缀：

- `avatar`
- `product`
- `tenant`
- `portal`
- `miniapp`
- `image`

允许示例：

- `avatar`
- `product`
- `tenant/logo`
- `portal/banner`
- `miniapp/banner`
- `image`

不允许示例：

- `../secret`
- `/etc`
- `private`
- `tenant/../../secret`

文件限制：

- 单文件最大 5MB。
- 单次最多 6 个文件。
- MIME 类型允许：
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `application/pdf`
  - `application/vnd.ms-excel`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 扩展名允许：
  - `.jpg`
  - `.jpeg`
  - `.png`
  - `.gif`
  - `.webp`
  - `.pdf`
  - `.xls`
  - `.xlsx`

返回示例：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "filename": "logo.png",
      "url": "https://oss.example.com/tenant/logo/1781234567890-logo.png",
      "success": true
    }
  ],
  "timestamp": "2026-06-12T10:00:00.000Z"
}
```

## 前端如何使用上传接口

### 浏览器上传示例

```ts
async function uploadFiles(files: File[], token: string, path = 'image') {
  const formData = new FormData();
  files.forEach((file) => formData.append('file', file));
  formData.append('path', path);

  const response = await fetch('/api/upload/fileList', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
}
```

注意：

- 不要手动设置 `Content-Type`，浏览器会自动生成 multipart boundary。
- 上传前建议前端先校验文件数量、大小、扩展名，避免无效请求。
- 登录过期时接口会返回未登录或验证失败，前端应跳转登录或刷新 token。

### Ant Design Upload 示例

```ts
const uploadProps = {
  name: 'file',
  multiple: true,
  action: '/api/upload/fileList',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  data: {
    path: 'product',
  },
  beforeUpload(file: File, fileList: File[]) {
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (fileList.length > 6) {
      message.error('单次最多上传 6 个文件');
      return Upload.LIST_IGNORE;
    }
    if (file.size > maxSize) {
      message.error('文件大小不能超过 5MB');
      return Upload.LIST_IGNORE;
    }
    if (!allowedTypes.includes(file.type)) {
      message.error('不支持的文件类型');
      return Upload.LIST_IGNORE;
    }

    return true;
  },
};
```

## 后端实现说明

新增/调整文件：

- `src/config/open-api.config.ts`
- `src/common/guards/open-api-signature.guard.ts`
- `src/config/index.ts`
- `src/app.module.ts`
- `src/modules/product/product.controller.ts`
- `src/modules/product/product.module.ts`
- `src/modules/tenant/tenant.controller.ts`
- `src/modules/tenant/tenant.module.ts`
- `src/modules/open/open-api.controller.ts`
- `src/modules/upload/upload.controller.ts`
- `src/modules/upload/upload.service.ts`

关键规则：

- `OpenApiSignatureGuard` 只挂在明确的第三方调用接口上。
- 签名校验通过后才写入 nonce，避免错误签名消耗 nonce。
- nonce 使用 Redis 原子写入，防止并发重放。
- 上传接口不再公开，依赖全局 `JwtAuthGuard`。
- 上传文件在 Controller 的 Multer 层和 Service 层分别校验。

## 兼容性影响

### 有影响

- 直接调用 `/api/products/public/*`、`/api/tenants/public/*` 的第三方系统，必须补签名 Header。
- 直接调用 `/api/upload/fileList` 的前端，必须带 `Authorization: Bearer <token>`。
- 不符合文件类型、大小、目录规则的上传会被拒绝。

### 无影响

- 官网 `/api/portal/:domain/*` 公开接口不受影响。
- 小程序首页分类、轮播图、黄页、信息列表等普通公开展示接口不受影响。
- 管理端已有登录态接口不受本次 Open API 签名影响。

## 验收标准

- 未携带签名调用第三方接口时，返回签名参数缺失。
- 使用错误 appKey 调用第三方接口时，返回 appKey 无效。
- 使用过期 timestamp 调用第三方接口时，返回签名已过期。
- 使用错误 signature 调用第三方接口时，返回签名错误。
- 使用相同 nonce 重复调用时，第二次返回 nonce 已使用。
- 正确签名调用第三方接口时，正常返回业务数据。
- 未登录调用上传接口时，被 JWT 守卫拒绝。
- 登录后上传允许类型且小于 5MB 的文件时，正常返回 OSS URL。
- 上传不允许扩展名、MIME 类型或超过 5MB 的文件时，返回明确错误。
- 上传目录不在白名单内时，返回“上传目录不允许”。

## 后续建议

- 建立 Open API 应用表，支持多 appKey、多租户授权、启停用、过期时间。
- 对 Open API 增加 IP 白名单、接口级限流和调用日志。
- 上传增加图片真实内容校验、病毒扫描、图片压缩和文件删除能力。
- 将公开接口返回字段改为专用 Public DTO，避免内部字段泄露。
- 将 Open API 签名算法沉淀为 SDK，减少第三方接入错误。
