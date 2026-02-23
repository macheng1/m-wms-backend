# 公开咨询 API 文档

## 接口概述

**接口地址**: `POST /api/notifications/public/consultation`

**认证方式**: 无需认证（公开接口）

**功能说明**: 供官网等公开场景使用，接收访客咨询并实时通知客服人员

---

## 请求参数

### 请求头

```
Content-Type: application/json
```

### 请求体 (JSON)

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| tenantId | string | 是 | 租户ID | `tenant-001` |
| name | string | 是 | 咨询人姓名 | `张三` |
| phone | string | 是 | 联系电话 | `13800138000` |
| email | string | 否 | 联系邮箱 | `zhangsan@example.com` |
| company | string | 否 | 公司名称 | `某某科技有限公司` |
| consultationType | string | 否 | 咨询类型 | `PRODUCT` / `PRICE` / `COOPERATION` / `OTHER` |
| message | string | 是 | 咨询内容 | `我想咨询一下产品A的价格和规格` |
| productSku | string | 否 | 产品SKU（咨询特定产品时） | `SKU-001` |
| productName | string | 否 | 产品名称 | `产品A` |
| source | string | 否 | 来源渠道 | `官网` / `微信` / `广告` |
| extraData | object | 否 | 扩展数据（JSON格式） | 见下方说明 |

### extraData 扩展字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| customerServiceIds | string[] | 指定接收通知的客服用户ID列表 | `['user-123', 'user-456']` |
| userAgent | string | 用户浏览器信息 | `Mozilla/5.0...` |
| ip | string | 访问者IP地址 | `1.2.3.4` |
| referer | string | 来源页面 | `https://example.com/product` |

---

## 请求示例

### 基础咨询

```bash
curl -X POST http://localhost:3000/api/notifications/public/consultation \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-001",
    "name": "张三",
    "phone": "13800138000",
    "message": "我想咨询一下产品的价格"
  }'
```

### 产品咨询

```bash
curl -X POST http://localhost:3000/api/notifications/public/consultation \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-001",
    "name": "李四",
    "phone": "13900139000",
    "email": "lisi@example.com",
    "company": "某某公司",
    "consultationType": "PRODUCT",
    "message": "请问产品A有现货吗？大概什么时候能发货？",
    "productSku": "SKU-001",
    "productName": "产品A",
    "source": "官网",
    "extraData": {
      "customerServiceIds": ["cs-user-001", "cs-user-002"]
    }
  }'
```

---

## 响应示例

### 成功响应

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

### 错误响应

```json
{
  "code": 400,
  "message": "缺少必填参数",
  "data": null
}
```

---

## 客服收到的通知格式

### 通知内容

```json
{
  "id": "notif-xxx",
  "type": "MESSAGE",
  "category": "CONSULTATION",
  "title": "新用户咨询 - 张三",
  "message": "收到来自张三的咨询：我想咨询一下产品的价格",
  "priority": "HIGH",
  "data": {
    "id": "consult-xxx",
    "name": "张三",
    "phone": "13800138000",
    "email": "zhangsan@example.com",
    "company": "某某公司",
    "consultationType": "PRODUCT",
    "message": "我想咨询一下产品的价格",
    "productSku": "SKU-001",
    "productName": "产品A",
    "source": "官网",
    "submittedAt": "2024-01-01T10:00:00Z"
  }
}
```

---

## 前端集成示例

### HTML 表单示例

```html
<form id="consultation-form">
  <input type="hidden" name="tenantId" value="tenant-001">

  <label>姓名 *</label>
  <input type="text" name="name" required>

  <label>电话 *</label>
  <input type="tel" name="phone" required>

  <label>邮箱</label>
  <input type="email" name="email">

  <label>公司名称</label>
  <input type="text" name="company">

  <label>咨询类型</label>
  <select name="consultationType">
    <option value="">请选择</option>
    <option value="PRODUCT">产品咨询</option>
    <option value="PRICE">价格咨询</option>
    <option value="COOPERATION">合作咨询</option>
    <option value="OTHER">其他</option>
  </select>

  <label>咨询内容 *</label>
  <textarea name="message" required></textarea>

  <button type="submit">提交咨询</button>
</form>

<script>
document.getElementById('consultation-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    const response = await fetch('http://localhost:3000/api/notifications/public/consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.code === 200) {
      alert('咨询已提交，我们会尽快与您联系！');
      e.target.reset();
    } else {
      alert('提交失败：' + result.message);
    }
  } catch (error) {
    alert('网络错误，请稍后重试');
  }
});
</script>
```

### React 示例

```tsx
import { useState } from 'react';

export function ConsultationForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const response = await fetch('/api/notifications/public/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          tenantId: 'tenant-001', // 从配置或环境变量获取
        }),
      });

      const result = await response.json();

      if (result.code === 200) {
        setSubmitted(true);
      } else {
        alert('提交失败：' + result.message);
      }
    } catch (error) {
      alert('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="success-message">
        <h3>咨询已提交！</h3>
        <p>我们会在工作时间内2小时内与您联系。</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="tenantId" value="tenant-001" />

      <div>
        <label>姓名 *</label>
        <input type="text" name="name" required />
      </div>

      <div>
        <label>电话 *</label>
        <input type="tel" name="phone" required />
      </div>

      <div>
        <label>咨询内容 *</label>
        <textarea name="message" required />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? '提交中...' : '提交咨询'}
      </button>
    </form>
  );
}
```

### Vue 3 示例

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input type="hidden" v-model="form.tenantId">

    <div>
      <label>姓名 *</label>
      <input v-model="form.name" type="text" required>
    </div>

    <div>
      <label>电话 *</label>
      <input v-model="form.phone" type="tel" required>
    </div>

    <div>
      <label>咨询内容 *</label>
      <textarea v-model="form.message" required></textarea>
    </div>

    <button type="submit" :disabled="loading">
      {{ loading ? '提交中...' : '提交咨询' }}
    </button>

    <div v-if="submitted" class="success">
      咨询已提交！我们会在工作时间内2小时内与您联系。
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';

const form = reactive({
  tenantId: 'tenant-001',
  name: '',
  phone: '',
  message: '',
});

const loading = ref(false);
const submitted = ref(false);

const handleSubmit = async () => {
  loading.value = true;

  try {
    const response = await fetch('/api/notifications/public/consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const result = await response.json();

    if (result.code === 200) {
      submitted.value = true;
    } else {
      alert('提交失败：' + result.message);
    }
  } catch (error) {
    alert('网络错误，请稍后重试');
  } finally {
    loading.value = false;
  }
};
</script>
```

---

## 注意事项

1. **无需认证**: 此接口为公开接口，不需要 Token 或登录认证
2. **通知方式**:
   - 如果提供了 `customerServiceIds`，通知指定客服
   - 否则发送广播通知给租户内所有在线用户
3. **建议配置**: 在租户配置中设置默认的客服用户ID列表
4. **验证码**: 建议在前端添加验证码防止恶意提交
5. **频率限制**: 建议添加 IP 频率限制（如每分钟最多 5 次提交）

---

## Swagger 文档

启动服务后访问: `http://localhost:3000/api/docs`

搜索 `POST /api/notifications/public/consultation` 查看完整文档
