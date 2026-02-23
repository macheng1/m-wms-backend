# 实时通知系统 - 前端 PRD

## 一、功能概述

实时通知系统基于 SSE (Server-Sent Events) 技术，为前端提供实时的消息推送能力，支持：

- **库存预警通知**：库存低于安全库存时实时提醒
- **库存变更通知**：入库、出库、调整时实时通知
- **用户咨询通知**：用户发起咨询时通知客服
- **@用户提醒**：订单备注@仓管员等场景
- **系统公告**：系统维护、公告等广播消息

---

## 二、技术方案

### 2.1 通信协议

使用 **SSE (Server-Sent Events)** 实现，相比 WebSocket 的优势：

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| 实现复杂度 | 简单 | 复杂 |
| 自动重连 | 内置 | 需手动实现 |
| 单向推送 | ✅ 适用 | 双向通信 |
| 浏览器支持 | 优秀 | 优秀 |

### 2.2 消息格式

```
event: message
data: {"id":"xxx","title":"库存预警","message":"产品A库存不足",...}

event: heartbeat
data: {"timestamp":"2024-01-01T00:00:00Z"}

event: connected
data: {"message":"SSE 连接已建立","timestamp":"2024-01-01T00:00:00Z"}
```

---

## 三、API 接口

### 3.1 SSE 订阅接口

**接口地址**: `GET /api/notifications/subscribe`

**请求头**:
```
Authorization: Bearer {token}
x-tenant-id: {tenantId}
```

**响应**: SSE 流（text/event-stream）

---

### 3.2 查询通知列表

**接口地址**: `POST /api/notifications/list`

**请求参数**:
```typescript
{
  page?: number;          // 页码，默认 1
  pageSize?: number;      // 每页数量，默认 20
  unreadOnly?: boolean;   // 只查询未读，默认 false
  type?: NotificationType;        // 按类型筛选
  category?: NotificationCategory; // 按分类筛选
  startDate?: string;     // 开始日期（ISO 8601）
  endDate?: string;       // 结束日期（ISO 8601）
}
```

**响应**:
```typescript
{
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

---

### 3.3 标记已读

**接口地址**: `POST /api/notifications/read`

**请求参数**:
```typescript
{
  notificationId?: string;  // 不传则标记所有为已读
}
```

**响应**:
```typescript
{
  message: string;
}
```

---

### 3.4 获取未读数量

**接口地址**: `GET /api/notifications/unread-count`

**响应**:
```typescript
{
  total: number;
  byType: Record<NotificationType, number>;
  highPriority: number;
  urgent: number;
}
```

---

## 四、前端集成方案

### 4.1 通知 Hook 实现

```typescript
// hooks/useNotification.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { EventSource } from 'eventsource'; // 或使用原生 EventSource
import type { NotificationMessage, UnreadCountResponse } from '@/types/notification';

interface UseNotificationOptions {
  token: string;
  tenantId: string;
  onMessage?: (notification: NotificationMessage) => void;
  onConnected?: () => void;
  onError?: (error: Event) => void;
}

export function useNotification(options: UseNotificationOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // 建立 SSE 连接
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/notifications/subscribe`;
    const eventSource = new EventSource(url, {
      headers: {
        'Authorization': `Bearer ${options.token}`,
        'x-tenant-id': options.tenantId,
      },
    });

    // 连接成功
    eventSource.addEventListener('connected', (event: MessageEvent) => {
      setIsConnected(true);
      options.onConnected?.();
      console.log('SSE 连接已建立');
    });

    // 收到通知
    eventSource.addEventListener('message', (event: MessageEvent) => {
      const notification: NotificationMessage = JSON.parse(event.data);
      setUnreadCount(prev => prev + 1);
      options.onMessage?.(notification);
    });

    // 心跳
    eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
      // 可用于检测连接状态
    });

    // 错误处理
    eventSource.onerror = (error) => {
      setIsConnected(false);
      options.onError?.(error);
      console.error('SSE 连接错误:', error);

      // 自动重连
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    eventSourceRef.current = eventSource;
  }, [options]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // 标记已读
  const markAsRead = useCallback(async (notificationId?: string) => {
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.token}`,
        'x-tenant-id': options.tenantId,
      },
      body: JSON.stringify({ notificationId }),
    });
    const result = await response.json();
    if (!notificationId) {
      setUnreadCount(0);
    } else {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    return result;
  }, [options.token, options.tenantId]);

  // 获取未读数量
  const fetchUnreadCount = useCallback(async () => {
    const response = await fetch('/api/notifications/unread-count', {
      headers: {
        'Authorization': `Bearer ${options.token}`,
        'x-tenant-id': options.tenantId,
      },
    });
    const result = await response.json();
    setUnreadCount(result.data.total);
    return result.data as UnreadCountResponse;
  }, [options.token, options.tenantId]);

  // 组件挂载时连接，卸载时断开
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    fetchUnreadCount,
  };
}
```

---

### 4.2 通知组件实现

```typescript
// components/NotificationBell.tsx
import React, { useState } from 'react';
import { BellOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Badge, Dropdown, List, Button, Tag, Empty } from 'antd';
import { useNotification } from '@/hooks/useNotification';
import type { NotificationMessage, NotificationType } from '@/types/notification';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function NotificationBell() {
  const { unreadCount, markAsRead } = useNotification({
    token: localStorage.getItem('token')!,
    tenantId: localStorage.getItem('tenantId')!,
    onMessage: handleNewNotification,
  });

  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [visible, setVisible] = useState(false);

  // 处理新通知
  function handleNewNotification(notification: NotificationMessage) {
    // 显示通知提示
    showNotificationToast(notification);

    // 添加到列表
    setNotifications(prev => [notification, ...prev]);
  }

  // 显示通知 Toast
  function showNotificationToast(notification: NotificationMessage) {
    const { title, message, priority, type } = notification;

    // 根据优先级选择通知样式
    const typeMap = {
      URGENT: 'error',
      HIGH: 'warning',
      NORMAL: 'info',
      LOW: 'info',
    } as const;

    // 根据通知类型选择图标
    const iconMap: Record<NotificationType, React.ReactNode> = {
      SYSTEM: <BellOutlined />,
      MESSAGE: <MessageOutlined />,
      MENTION: <AtOutlined />,
      TICKET: <CustomerServiceOutlined />,
      WORKFLOW: <AuditOutlined />,
    };

    notification.open({
      message: title,
      description: message,
      icon: iconMap[type],
      type: typeMap[priority],
      duration: priority === 'URGENT' ? 0 : 4.5,
      placement: 'topRight',
    });
  }

  // 渲染通知列表项
  function renderNotificationItem(item: NotificationMessage) {
    const { type, category, title, message, createdAt, isRead, priority } = item;

    // 优先级颜色
    const priorityColor = {
      URGENT: '#ff4d4f',
      HIGH: '#faad14',
      NORMAL: '#52c41a',
      LOW: '#d9d9d9',
    }[priority];

    return (
      <List.Item
        key={item.id}
        style={{
          background: isRead ? 'transparent' : '#f6ffed',
          padding: '12px 16px',
        }}
        actions={[
          !isRead && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => markAsRead(item.id)}
            >
              标为已读
            </Button>
          ),
        ]}
      >
        <List.Item.Meta
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!isRead && <Badge status="processing" />}
              <span>{title}</span>
              {priority !== 'NORMAL' && (
                <Tag color={priorityColor} style={{ margin: 0 }}>
                  {priority === 'URGENT' ? '紧急' : priority === 'HIGH' ? '重要' : '普通'}
                </Tag>
              )}
            </div>
          }
          description={
            <div>
              <div style={{ marginBottom: 4 }}>{message}</div>
              <div style={{ fontSize: 12, color: '#999' }}>
                {dayjs(createdAt).fromNow()}
              </div>
            </div>
          }
        />
      </List.Item>
    );
  }

  // 一键全部已读
  async function markAllAsRead() {
    await markAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }

  return (
    <Dropdown
      open={visible}
      onOpenChange={setVisible}
      dropdownRender={(menu) => (
        <div style={{ width: 380, maxHeight: 500, overflow: 'auto' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>消息通知</span>
              {unreadCount > 0 && (
                <Button type="link" size="small" onClick={markAllAsRead}>
                  全部已读
                </Button>
              )}
            </div>
          </div>
          {notifications.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无通知"
              style={{ padding: '40px 0' }}
            />
          ) : (
            <List
              dataSource={notifications}
              renderItem={renderNotificationItem}
              style={{ maxHeight: 400, overflow: 'auto' }}
            />
          )}
        </div>
      )}
    >
      <Badge count={unreadCount} size="small" offset={[0, 4]}>
        <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
      </Badge>
    </Dropdown>
  );
}
```

---

### 4.3 库存通知专门处理

```typescript
// hooks/useInventoryNotification.ts
import { useEffect } from 'react';
import { useNotification } from './useNotification';

export function useInventoryNotification() {
  const { isConnected } = useNotification({
    token: localStorage.getItem('token')!,
    tenantId: localStorage.getItem('tenantId')!,
    onMessage: handleInventoryNotification,
  });

  useEffect(() => {
    // 可以在这里处理库存相关的特殊逻辑
    if (isConnected) {
      console.log('库存通知已连接');
    }
  }, [isConnected]);
}

function handleInventoryNotification(notification: NotificationMessage) {
  // 只处理库存相关通知
  if (notification.category !== 'INVENTORY_WARNING' &&
      notification.category !== 'INVENTORY_CHANGE') {
    return;
  }

  const { type, category, title, message, data, priority } = notification;

  switch (category) {
    case 'INVENTORY_WARNING':
      // 库存预警
      handleStockWarning(notification);
      break;

    case 'INVENTORY_CHANGE':
      // 库存变更
      handleStockChange(notification);
      break;
  }
}

function handleStockWarning(notification: NotificationMessage) {
  const { title, message, data } = notification;
  const { sku, productName, currentQty, safetyStock, alertLevel } = data || {};

  // 根据预警级别展示不同效果
  if (alertLevel === 'CRITICAL' || currentQty <= 0) {
    // 严重预警：零库存
    notification.error({
      message: title,
      description: `${productName}(${sku}) 已零库存！`,
      duration: 0,
    });

    // 可以触发弹窗或其他醒目提示
    Modal.warning({
      title: '库存严重预警',
      content: `${productName}(${sku}) 当前库存为 0，请及时补货！`,
      okText: '我知道了',
    });
  } else {
    // 普通预警
    notification.warning({
      message: title,
      description: message,
    });
  }
}

function handleStockChange(notification: NotificationMessage) {
  const { title, message, data } = notification;
  const { sku, productName, direction, quantity, beforeQty, afterQty, unitSymbol } = data || {};

  // 库存变更提示
  notification.info({
    message: title,
    description: message,
  });

  // 可以在这里触发页面刷新或其他操作
  // 例如：刷新库存列表页面
  eventBus.emit('refreshInventoryList');
}
```

---

## 五、通知类型与处理

### 5.1 库存预警通知

```typescript
interface StockWarningNotification {
  type: 'SYSTEM';
  category: 'INVENTORY_WARNING';
  title: '库存预警 - 严重';  // 或 '高' / '中'
  message: '【产品A(SKU-001)】当前库存 5件，低于安全库存 10件。库存已严重不足，请及时补货！';

  data: {
    sku: 'SKU-001';
    productName: '产品A';
    currentQty: 5;
    safetyStock: 10;
    unitSymbol: '件';
    alertLevel: 'CRITICAL';  // CRITICAL | HIGH | MEDIUM
    alertLabel: '严重不足';
  };

  priority: 'URGENT';  // 零库存为紧急，高为重要，其他为普通
}
```

### 5.2 库存变更通知

```typescript
interface StockChangeNotification {
  type: 'SYSTEM';
  category: 'INVENTORY_CHANGE';
  title: '库存入库通知';  // 或 '库存出库通知'
  message: '【产品A(SKU-001)】采购入库 +100件，库存从 50件 变更为 150件';

  data: {
    sku: 'SKU-001';
    productName: '产品A';
    transactionType: 'INBOUND_PURCHASE';
    typeDisplayName: '采购入库';
    direction: '入库';  // '入库' | '出库'
    quantity: 100;
    beforeQty: 50;
    afterQty: 150;
    unitSymbol: '件';
  };

  priority: 'NORMAL';
}
```

### 5.3 用户咨询通知

```typescript
interface ConsultationNotification {
  type: 'MESSAGE';
  category: 'CONSULTATION';
  title: '新用户咨询';
  message: '用户 张三 发起咨询';

  data: {
    fromUser: 'user-123';
    fromUserName: '张三';
    consultationId: 'consult-001';
  };

  priority: 'HIGH';
}
```

---

## 六、前端页面集成

### 6.1 在布局中集成通知组件

```typescript
// layouts/MainLayout.tsx
import { NotificationBell } from '@/components/NotificationBell';

export function MainLayout() {
  return (
    <Layout>
      <Layout.Header>
        <div className="logo">WMS 系统</div>
        <div className="header-right">
          {/* 其他头部内容 */}
          <NotificationBell />
          <UserDropdown />
        </div>
      </Layout.Header>

      <Layout.Content>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
```

### 6.2 在特定页面监听库存通知

```typescript
// pages/Inventory/index.tsx
import { useEffect } from 'react';
import { useInventoryNotification } from '@/hooks/useInventoryNotification';

export function InventoryPage() {
  // 启用库存通知监听
  useInventoryNotification();

  // 页面逻辑...

  return (
    <div>
      <h1>库存管理</h1>
      {/* 库存列表 */}
    </div>
  );
}
```

---

## 七、错误处理与重连

### 7.1 连接状态管理

```typescript
enum ConnectionState {
  CONNECTING = 'connecting',    // 连接中
  CONNECTED = 'connected',      // 已连接
  DISCONNECTED = 'disconnected',// 已断开
  ERROR = 'error',              // 错误
}

function useConnectionState() {
  const [state, setState] = useState<ConnectionState>(ConnectionState.CONNECTING);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRY = 5;

  const reconnect = useCallback(() => {
    if (retryCount >= MAX_RETRY) {
      setState(ConnectionState.ERROR);
      return;
    }

    setState(ConnectionState.CONNECTING);
    setRetryCount(prev => prev + 1);

    // 延迟重连（指数退避）
    setTimeout(() => {
      connect();
    }, Math.min(1000 * Math.pow(2, retryCount), 30000));
  }, [retryCount]);

  return { state, retryCount, reconnect };
}
```

### 7.2 用户提示

```typescript
// 连接断开时显示提示
function ConnectionStatusIndicator() {
  const { isConnected } = useNotification();

  if (!isConnected) {
    return (
      <Alert
        message="通知服务已断开"
        description="实时消息暂时不可用，正在尝试重新连接..."
        type="warning"
        showIcon
        closable
      />
    );
  }

  return null;
}
```

---

## 八、测试与调试

### 8.1 测试 SSE 连接

```bash
# 使用 curl 测试
curl -N \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  http://localhost:3000/api/notifications/subscribe
```

### 8.2 发送测试通知

```bash
curl -X POST http://localhost:3000/api/notifications/send-to-users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tenantId": "tenant-001",
    "userIds": ["YOUR_USER_ID"],
    "type": "SYSTEM",
    "category": "INVENTORY_WARNING",
    "title": "测试通知",
    "message": "这是一条测试消息",
    "priority": "NORMAL"
  }'
```

---

## 九、注意事项

1. **Token 过期处理**: SSE 连接不会自动更新 Token，需要在前端检测到 401 后重新建立连接
2. **多标签页**: 多个标签页同时打开时会创建多个 SSE 连接，建议使用 BroadcastChannel 同步通知状态
3. **移动端兼容**: 移动端浏览器对 SSE 支持良好，但需要注意后台运行时连接可能被系统暂停
4. **服务器负载**: 每个 SSE 连接会占用服务器资源，大量并发连接时需要注意性能
