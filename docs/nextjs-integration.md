# 实时通知系统 - Next.js + React 集成指南

## 📦 目录

- [一、安装依赖](#一安装依赖)
- [二、类型定义](#二类型定义)
- [三、React Hooks](#三react-hooks)
- [四、组件库](#四组件库)
- [五、Next.js 集成](#五nextjs-集成)
- [六、完整示例](#六完整示例)

---

## 一、安装依赖

```bash
# npm
npm install dayjs swr

# yarn
yarn add dayjs swr

# pnpm
pnpm add dayjs swr
```

---

## 二、类型定义

创建 `types/notification.ts`:

```typescript
// types/notification.ts

/**
 * 通知类型枚举
 */
export enum NotificationType {
  SYSTEM = 'SYSTEM',
  MESSAGE = 'MESSAGE',
  MENTION = 'MENTION',
  TICKET = 'TICKET',
  WORKFLOW = 'WORKFLOW',
}

/**
 * 通知分类枚举
 */
export enum NotificationCategory {
  INVENTORY_WARNING = 'INVENTORY_WARNING',
  INVENTORY_CHANGE = 'INVENTORY_CHANGE',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  CONSULTATION = 'CONSULTATION',
  REPLY = 'REPLY',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  APPROVAL_APPROVED = 'APPROVAL_APPROVED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
}

/**
 * 通知优先级
 */
export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * 通知消息
 */
export interface NotificationMessage {
  id: string;
  tenantId: string;
  userId?: string;
  roleId?: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  createdAt: string;
  expireAt?: string;
  isRead?: boolean;
  readAt?: string;
}

/**
 * 未读统计
 */
export interface UnreadCount {
  total: number;
  byType: Record<NotificationType, number>;
  highPriority: number;
  urgent: number;
}

/**
 * 分页参数
 */
export interface NotificationListParams {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
  category?: NotificationCategory;
  startDate?: string;
  endDate?: string;
}

/**
 * 分页响应
 */
export interface NotificationListResponse {
  data: NotificationMessage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * SSE 事件类型
 */
export type SSEEventType = 'connected' | 'message' | 'heartbeat' | 'error';

/**
 * SSE 事件
 */
export interface SSEEvent {
  type: SSEEventType;
  data: any;
  timestamp: number;
}
```

---

## 三、React Hooks

### 3.1 useNotification - 核心通知 Hook

创建 `hooks/use-notification.ts`:

```typescript
// hooks/use-notification.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import type {
  NotificationMessage,
  UnreadCount,
  SSEEvent,
  SSEEventType,
} from '@/types/notification';

interface UseNotificationOptions {
  enabled?: boolean;
  onMessage?: (notification: NotificationMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

interface NotificationState {
  isConnected: boolean;
  isConnecting: boolean;
  unreadCount: number;
  lastMessage: NotificationMessage | null;
  error: Error | null;
}

export function useNotification(options: UseNotificationOptions = {}) {
  const {
    enabled = true,
    onMessage,
    onConnected,
    onDisconnected,
    onError,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [state, setState] = useState<NotificationState>({
    isConnected: false,
    isConnecting: false,
    unreadCount: 0,
    lastMessage: null,
    error: null,
  });

  // 获取认证信息
  const [token] = useLocalStorage('token', '');
  const [tenantId] = useLocalStorage('tenantId', '');

  /**
   * 建立 SSE 连接
   */
  const connect = useCallback(() => {
    if (!enabled || !token || !tenantId) {
      return;
    }

    // 清理旧连接
    disconnect();

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const url = `/api/notifications/subscribe`;
      const eventSource = new EventSource(url);

      // 连接成功
      eventSource.addEventListener('connected', (e: MessageEvent) => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
        }));
        onConnected?.();
      });

      // 收到消息
      eventSource.addEventListener('message', (e: MessageEvent) => {
        const notification: NotificationMessage = JSON.parse(e.data);
        setState(prev => ({
          ...prev,
          lastMessage: notification,
          unreadCount: prev.unreadCount + 1,
        }));
        onMessage?.(notification);
      });

      // 心跳
      eventSource.addEventListener('heartbeat', () => {
        // 可以用于检测连接状态
      });

      // 错误处理
      eventSource.onerror = (error) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error as Error,
        }));
        onError?.(error);
        eventSource.close();

        // 自动重连
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error as Error,
      }));
    }
  }, [enabled, token, tenantId, onConnected, onMessage, onError]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }));
    onDisconnected?.();
  }, [onDisconnected]);

  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  /**
   * 组件挂载时连接，卸载时断开
   */
  useEffect(() => {
    if (enabled && token && tenantId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, token, tenantId]);

  /**
   * 标记已读
   */
  const markAsRead = useCallback(async (notificationId?: string) => {
    const response = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationId }),
    });

    if (response.ok) {
      setState(prev => ({
        ...prev,
        unreadCount: notificationId
          ? Math.max(0, prev.unreadCount - 1)
          : 0,
      }));
    }

    return response.json();
  }, []);

  /**
   * 获取未读数量
   */
  const fetchUnreadCount = useCallback(async () => {
    const response = await fetch('/api/notifications/unread-count');
    const result = await response.json();
    setState(prev => ({ ...prev, unreadCount: result.data.total }));
    return result.data as UnreadCount;
  }, []);

  return {
    // 状态
    ...state,
    // 方法
    connect,
    disconnect,
    reconnect,
    markAsRead,
    markAllAsRead: () => markAsRead(),
    fetchUnreadCount,
  };
}
```

### 3.2 useNotificationList - 通知列表 Hook

```typescript
// hooks/use-notification-list.ts
'use client';

import useSWR, { useSWRConfig } from 'swr';
import { useCallback } from 'react';
import type { NotificationListResponse, NotificationListParams } from '@/types/notification';

const fetcher = async (url: string, params?: NotificationListParams) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: params ? JSON.stringify(params) : undefined,
  });
  return response.json();
};

export function useNotificationList(params: NotificationListParams = {}) {
  const { mutate } = useSWRConfig();

  const { data, error, isLoading, mutate: localMutate } = useSWR<NotificationListResponse>(
    ['/api/notifications/list', params],
    () => fetcher('/api/notifications/list', params),
    {
      refreshInterval: 0, // 由 SSE 触发更新
      revalidateOnFocus: false,
    }
  );

  /**
   * 标记已读并更新缓存
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    });

    // 更新本地缓存
    localMutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          ),
        };
      },
      false
    );
  }, [localMutate]);

  /**
   * 标记所有已读
   */
  const markAllAsRead = useCallback(async () => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // 更新本地缓存
    localMutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.map(n => ({ ...n, isRead: true })),
        };
      },
      false
    );
  }, [localMutate]);

  return {
    notifications: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 20,
    totalPages: data?.totalPages ?? 0,
    hasNext: data?.hasNext ?? false,
    hasPrev: data?.hasPrev ?? false,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: localMutate,
  };
}
```

---

## 四、组件库

### 4.1 NotificationBell - 通知铃铛组件

```typescript
// components/NotificationBell.tsx
'use client';

import { useState } from 'react';
import { BellOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { Badge, Dropdown, Button, List, Tag, Empty, Tabs, Tooltip } from 'antd';
import { useNotification, useNotificationList } from '@/hooks';
import type { NotificationMessage, NotificationType } from '@/types/notification';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const { unreadCount, markAsRead, markAllAsRead } = useNotification({
    onMessage: (notification) => {
      // 可以在这里处理新通知，如显示 Toast
      console.log('新通知:', notification);
    },
  });

  const { notifications, isLoading, markAsRead: markItemRead } = useNotificationList(
    activeTab === 'unread' ? { unreadOnly: true, pageSize: 10 } : { pageSize: 10 }
  );

  // 处理标记已读
  const handleMarkAsRead = async (id: string) => {
    await markItemRead(id);
    await markAsRead(id);
  };

  // 处理全部已读
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // 渲染通知项
  const renderItem = (item: NotificationMessage) => {
    const priorityColor = {
      URGENT: 'error',
      HIGH: 'warning',
      NORMAL: 'default',
      LOW: 'default',
    }[item.priority];

    const typeIcon = {
      SYSTEM: '🔔',
      MESSAGE: '💬',
      MENTION: '@',
      TICKET: '🎫',
      WORKFLOW: '📋',
    }[item.type];

    return (
      <List.Item
        key={item.id}
        style={{
          background: item.isRead ? 'transparent' : '#f6ffed',
          padding: '12px 16px',
          cursor: 'pointer',
        }}
        actions={[
          !item.isRead && (
            <Tooltip title="标为已读">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkAsRead(item.id);
                }}
              />
            </Tooltip>
          ),
        ]}
      >
        <List.Item.Meta
          avatar={
            <span style={{ fontSize: 24 }}>
              {typeIcon}
            </span>
          }
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!item.isRead && <Badge status="processing" />}
              <span>{item.title}</span>
              {item.priority !== 'NORMAL' && (
                <Tag color={priorityColor} style={{ margin: 0 }}>
                  {item.priority === 'URGENT' ? '紧急' : '重要'}
                </Tag>
              )}
            </div>
          }
          description={
            <div>
              <div style={{ marginBottom: 4, color: '#333' }}>
                {item.message}
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>
                {dayjs(item.createdAt).fromNow()}
              </div>
            </div>
          }
        />
      </List.Item>
    );
  };

  const dropdownContent = (
    <div style={{ width: 400, maxHeight: 500 }}>
      {/* 头部 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 500 }}>消息通知</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllAsRead}>
            全部已读
          </Button>
        )}
      </div>

      {/* 标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'all' | 'unread')}
        items={[
          { key: 'all', label: `全部 (${notifications.length})` },
          { key: 'unread', label: `未读 (${unreadCount})` },
        ]}
        style={{ padding: '0 12px' }}
      />

      {/* 列表 */}
      {isLoading ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>加载中...</div>
      ) : notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无通知"
          style={{ padding: '40px 0' }}
        />
      ) : (
        <List
          dataSource={notifications}
          renderItem={renderItem}
          style={{
            maxHeight: 400,
            overflowY: 'auto',
            padding: '0 12px 12px',
          }}
        />
      )}

      {/* 底部 */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #f0f0f0',
        textAlign: 'center',
      }}>
        <Button type="link" href="/notifications" onClick={() => setOpen(false)}>
          查看全部通知
        </Button>
      </div>
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => dropdownContent}
      trigger={['click']}
    >
      <Badge count={unreadCount} size="small" offset={[0, 4]}>
        <Tooltip title="通知">
          <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
        </Tooltip>
      </Badge>
    </Dropdown>
  );
}
```

### 4.2 NotificationToast - 通知 Toast 组件

```typescript
// components/NotificationToast.tsx
'use client';

import { useEffect } from 'react';
import { message } from 'antd';
import { useNotification } from '@/hooks';
import type { NotificationMessage, NotificationType, NotificationPriority } from '@/types/notification';

// 通知类型图标映射
const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  SYSTEM: '🔔',
  MESSAGE: '💬',
  MENTION: '@',
  TICKET: '🎫',
  WORKFLOW: '📋',
};

// 优先级到 message 类型的映射
const PRIORITY_TYPE: Record<NotificationPriority, 'success' | 'info' | 'warning' | 'error'> = {
  URGENT: 'error',
  HIGH: 'warning',
  NORMAL: 'info',
  LOW: 'info',
};

// 优先级对应的持续时间（秒）
const PRIORITY_DURATION: Record<NotificationPriority, number> = {
  URGENT: 0,    // 不自动关闭
  HIGH: 6,
  NORMAL: 4.5,
  LOW: 3,
};

export function NotificationToast() {
  const { onMessage } = useNotification();

  useEffect(() => {
    onMessage?.((notification: NotificationMessage) => {
      const { title, message: content, type, priority } = notification;
      const icon = TYPE_ICONS[type];
      const messageType = PRIORITY_TYPE[priority];
      const duration = PRIORITY_DURATION[priority];

      // 使用 antd 的 message 组件显示通知
      message[messageType]({
        content: (
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {icon} {title}
            </div>
            <div>{content}</div>
          </div>
        ),
        duration,
      });
    });
  }, [onMessage]);

  return null; // 这是一个纯功能组件，不渲染任何内容
}
```

### 4.3 NotificationProvider - 全局状态管理

```typescript
// contexts/NotificationContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useNotification } from '@/hooks';
import type { NotificationMessage } from '@/types/notification';

interface NotificationContextValue {
  isConnected: boolean;
  unreadCount: number;
  lastMessage: NotificationMessage | null;
  markAsRead: (notificationId?: string) => Promise<void>;
  fetchUnreadCount: () => Promise<any>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const notification = useNotification({
    enabled: true,
    // 新通知到达时可以处理
    onMessage: (notification) => {
      // 可以在这里触发全局事件，比如更新通知列表缓存
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notification', {
          detail: notification,
        }));
      }
    },
  });

  return (
    <NotificationContext.Provider value={notification}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}
```

---

## 五、Next.js 集成

### 5.1 App Router (Next.js 13+)

#### 5.1.1 创建布局

```typescript
// app/layout.tsx
import { NotificationProvider, NotificationToast, NotificationBell } from '@/components/notifications';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <NotificationProvider>
          <NotificationToast />
          {/* 头部导航 */}
          <header>
            <h1>WMS 系统</h1>
            <nav>
              {/* ...其他导航项 */}
              <NotificationBell />
            </nav>
          </header>
          <main>{children}</main>
        </NotificationProvider>
      </body>
    </html>
  );
}
```

#### 5.1.2 通知页面

```typescript
// app/notifications/page.tsx
'use client';

import { useNotificationList } from '@/hooks';
import { List, Tag, Button, Empty } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export default function NotificationsPage() {
  const {
    notifications,
    total,
    page,
    totalPages,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotificationList({ pageSize: 20 });

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>通知中心</h1>
        <Button onClick={markAllAsRead}>全部已读</Button>
      </div>

      <List
        loading={isLoading}
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            style={{
              background: item.isRead ? 'transparent' : '#f6ffed',
              padding: 16,
              marginBottom: 8,
              borderRadius: 8,
            }}
            actions={[
              !item.isRead && (
                <Button type="link" onClick={() => markAsRead(item.id)}>
                  标为已读
                </Button>
              ),
            ]}
          >
            <List.Item.Meta
              title={
                <span>
                  {!item.isRead && <Badge status="processing" />}
                  {item.title}
                  {item.priority !== 'NORMAL' && (
                    <Tag color={item.priority === 'URGENT' ? 'error' : 'warning'}>
                      {item.priority === 'URGENT' ? '紧急' : '重要'}
                    </Tag>
                  )}
                </span>
              }
              description={
                <>
                  <p>{item.message}</p>
                  <p style={{ color: '#999', fontSize: 12 }}>
                    {dayjs(item.createdAt).fromNow()}
                  </p>
                </>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
```

### 5.2 Pages Router (Next.js 12 及以下)

#### 5.2.1 创建 _app.tsx

```typescript
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { NotificationProvider, NotificationToast } from '@/components/notifications';
import Layout from '@/components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NotificationProvider>
      <Layout>
        <NotificationToast />
        <Component {...pageProps} />
      </Layout>
    </NotificationProvider>
  );
}
```

#### 5.2.2 创建通知页面

```typescript
// pages/notifications.tsx
import { useNotificationList } from '@/hooks';
// ... 类似 App Router 的实现

export default function NotificationsPage() {
  // 同上
}
```

---

## 六、完整示例

### 6.1 库存页面集成

```typescript
// app/inventory/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useNotification } from '@/hooks';
import { Table, Tag } from 'antd';

export default function InventoryPage() {
  const { isConnected } = useNotification({
    // 只处理库存相关通知
    onMessage: (notification) => {
      if (notification.category === 'INVENTORY_WARNING') {
        // 处理库存预警
        handleStockWarning(notification);
      } else if (notification.category === 'INVENTORY_CHANGE') {
        // 处理库存变更
        handleStockChange(notification);
      }
    },
  });

  const [inventoryData, setInventoryData] = useState([]);

  // 刷新库存数据
  const refreshInventory = async () => {
    const response = await fetch('/api/inventory/list');
    const data = await response.json();
    setInventoryData(data.list);
  };

  // 处理库存预警
  const handleStockWarning = (notification: any) => {
    const { data } = notification;
    const { productName, sku, currentQty, safetyStock, alertLevel } = data || {};

    if (alertLevel === 'CRITICAL' || currentQty <= 0) {
      // 零库存 - 弹窗警告
      Modal.warning({
        title: '库存严重预警',
        content: `${productName}(${sku}) 已零库存，请及时补货！`,
      });
    } else {
      // 普通预警 - message 提示
      message.warning(`${productName}(${sku}) 库存不足`);
    }
  };

  // 处理库存变更
  const handleStockChange = (notification: any) => {
    // 自动刷新库存列表
    refreshInventory();
  };

  useEffect(() => {
    refreshInventory();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        连接状态: {isConnected ? '已连接' : '未连接'}
      </div>
      <Table dataSource={inventoryData} columns={/* ... */} />
    </div>
  );
}
```

### 6.2 客服页面集成

```typescript
// app/customer-service/page.tsx
'use client';

import { useNotification } from '@/hooks';
import { Badge, List } from 'antd';

export default function CustomerServicePage() {
  const { unreadCount } = useNotification({
    onMessage: (notification) => {
      // 处理用户咨询
      if (notification.category === 'CONSULTATION') {
        const { fromUserName, consultationId } = notification.data || {};
        message.info(`收到 ${fromUserName} 的新咨询`);
        // 可以自动刷新咨询列表或打开咨询会话
      }
    },
  });

  return (
    <div>
      <h1>客服工作台</h1>
      <Badge count={unreadCount} />
      {/* 咨询列表 */}
    </div>
  );
}
```

---

## 七、环境变量配置

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

---

## 八、注意事项

1. **客户端渲染**: 所有通知相关的组件都需要使用 `'use client'` 指令
2. **认证存储**: Token 和 TenantId 建议使用 localStorage 或 cookies 存储
3. **SSE 限制**: 浏览器对同域名的 SSE 连接数有限制（通常为 6 个）
4. **多标签页**: 多个标签页会创建多个连接，可以考虑使用 BroadcastChannel 同步状态
5. **移动端**: 移动端浏览器在后台可能暂停 SSE 连接，需要处理重连逻辑
