import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Response } from 'express';
import { INotificationMessage, ISseConnection } from '../interfaces/notification.interface';

/**
 * SSE 连接管理器
 *
 * 负责管理所有活跃的 SSE 连接，提供连接的注册、移除和消息推送功能
 * 连接按 租户 -> 用户 组织，支持：
 * - 同一用户多设备同时在线
 * - 按租户/用户精准推送
 * - 连接状态监控和清理
 */
@Injectable()
export class SseConnectionManager implements OnModuleDestroy {
  private readonly logger = new Logger(SseConnectionManager.name);

  /**
   * 连接池存储结构
   * Map<tenantId, Map<userId, Set<connection>>>
   *
   * 第一层 Key: 租户ID
   * 第二层 Key: 用户ID
   * 第三层 Value: 该用户的所有连接（支持多设备）
   */
  private connections = new Map<string, Map<string, Set<ISseConnection>>>();

  /**
   * 心跳间隔（毫秒）
   * 定期向客户端发送心跳，检测连接是否存活
   */
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒

  /**
   * 连接超时时间（毫秒）
   * 超过此时间未收到心跳的连接将被清理
   */
  private readonly CONNECTION_TIMEOUT = 60000; // 60秒

  /**
   * 心跳定时器
   */
  private heartbeatTimer: NodeJS.Timeout;

  constructor() {
    // 启动心跳检测
    this.startHeartbeat();
  }

  /**
   * 模块销毁时的清理工作
   */
  onModuleDestroy() {
    // 清理心跳定时器
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // 关闭所有连接
    this.closeAllConnections();
    this.logger.log('SSE Connection Manager 已销毁');
  }

  /**
   * 注册新的 SSE 连接
   *
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @param response Express 响应对象
   * @returns 连接信息对象
   */
  register(tenantId: string, userId: string, response: Response): ISseConnection {
    // 确保 SSE 响应头已设置
    this.setSseHeaders(response);

    // 创建连接对象
    const connection: ISseConnection = {
      tenantId,
      userId,
      response,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    // 获取或创建租户的连接映射
    if (!this.connections.has(tenantId)) {
      this.connections.set(tenantId, new Map());
    }
    const tenantConnections = this.connections.get(tenantId)!;

    // 获取或创建用户的连接集合
    if (!tenantConnections.has(userId)) {
      tenantConnections.set(userId, new Set());
    }
    const userConnections = tenantConnections.get(userId)!;

    // 添加连接到集合
    userConnections.add(connection);

    this.logger.log(
      `新连接注册: 租户=${tenantId}, 用户=${userId}, ` +
      `租户总连接=${this.getTenantConnectionCount(tenantId)}, ` +
      `总连接=${this.getTotalConnectionCount()}`
    );

    // 发送连接成功消息
    this.sendToConnection(connection, {
      event: 'connected',
      data: {
        message: 'SSE 连接已建立',
        timestamp: new Date().toISOString(),
      },
    });

    // 监听连接关闭事件
    response.on('close', () => {
      this.remove(tenantId, userId, connection);
    });

    return connection;
  }

  /**
   * 移除 SSE 连接
   *
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @param connection 要移除的连接对象
   */
  remove(tenantId: string, userId: string, connection: ISseConnection): void {
    const tenantConnections = this.connections.get(tenantId);
    if (!tenantConnections) return;

    const userConnections = tenantConnections.get(userId);
    if (!userConnections) return;

    // 从集合中移除连接
    const removed = userConnections.delete(connection);

    // 如果该用户没有连接了，删除用户的映射
    if (userConnections.size === 0) {
      tenantConnections.delete(userId);
    }

    // 如果该租户没有连接了，删除租户的映射
    if (tenantConnections.size === 0) {
      this.connections.delete(tenantId);
    }

    if (removed) {
      this.logger.log(
        `连接已移除: 租户=${tenantId}, 用户=${userId}, ` +
        `剩余连接=${this.getTotalConnectionCount()}`
      );
    }
  }

  /**
   * 发送消息给指定租户的所有用户（广播）
   *
   * @param tenantId 租户ID
   * @param message 通知消息
   */
  broadcastToTenant(tenantId: string, message: INotificationMessage): void {
    const tenantConnections = this.connections.get(tenantId);
    if (!tenantConnections || tenantConnections.size === 0) {
      this.logger.debug(`租户 ${tenantId} 没有活跃连接`);
      return;
    }

    let sentCount = 0;
    tenantConnections.forEach((userConnections, userId) => {
      userConnections.forEach((connection) => {
        if (this.sendToConnection(connection, message)) {
          sentCount++;
        }
      });
    });

    this.logger.log(
      `广播到租户 ${tenantId}: 发送=${sentCount}条, ` +
      `用户数=${tenantConnections.size}`
    );
  }

  /**
   * 发送消息给指定用户
   *
   * @param tenantId 租户ID
   * @param userId 用户ID
   * @param message 通知消息
   */
  sendToUser(tenantId: string, userId: string, message: INotificationMessage): void {
    const tenantConnections = this.connections.get(tenantId);
    if (!tenantConnections) {
      this.logger.debug(`租户 ${tenantId} 没有活跃连接`);
      return;
    }

    const userConnections = tenantConnections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      this.logger.debug(`用户 ${tenantId}/${userId} 没有活跃连接`);
      return;
    }

    let sentCount = 0;
    userConnections.forEach((connection) => {
      if (this.sendToConnection(connection, message)) {
        sentCount++;
      }
    });

    this.logger.log(
      `发送给用户 ${tenantId}/${userId}: 发送=${sentCount}条`
    );
  }

  /**
   * 发送消息给多个用户
   *
   * @param tenantId 租户ID
   * @param userIds 用户ID列表
   * @param message 通知消息
   */
  sendToUsers(tenantId: string, userIds: string[], message: INotificationMessage): void {
    let totalSent = 0;
    userIds.forEach((userId) => {
      const tenantConnections = this.connections.get(tenantId);
      if (!tenantConnections) return;

      const userConnections = tenantConnections.get(userId);
      if (!userConnections) return;

      userConnections.forEach((connection) => {
        if (this.sendToConnection(connection, message)) {
          totalSent++;
        }
      });
    });

    this.logger.log(
      `发送给多用户 ${tenantId}: 用户=${userIds.length}, 发送=${totalSent}条`
    );
  }

  /**
   * 向单个连接发送消息
   *
   * @param connection 连接对象
   * @param data 要发送的数据（可以是字符串或对象）
   * @returns 是否发送成功
   */
  private sendToConnection(connection: ISseConnection, data: any): boolean {
    try {
      const response = connection.response;

      // 检查连接是否已关闭
      if (!response.writableEnded) {
        // 如果是对象，序列化为 SSE 格式
        if (typeof data === 'object') {
          const event = data.event || 'message';
          // 兼容两种格式：
          // 1. 系统消息：{ event: 'connected'/'heartbeat', data: {...} }
          // 2. 通知消息：INotificationMessage (id, title, message, data...)
          let payload: string;
          // 判断是否是系统消息格式（显式设置了 event 字段）
          const isSystemMessage = data.hasOwnProperty('event') && data.event;
          if (isSystemMessage && data.data !== undefined) {
            // 系统消息格式：{ event: 'xxx', data: {...} }
            payload = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
          } else {
            // 通知消息格式：INotificationMessage，整个对象作为 payload
            payload = JSON.stringify(data);
          }
          response.write(`event: ${event}\n`);
          response.write(`data: ${payload}\n\n`);
        } else {
          response.write(`data: ${data}\n\n`);
        }
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(
        `发送消息失败: 租户=${connection.tenantId}, 用户=${connection.userId}`,
        error
      );
      return false;
    }
  }

  /**
   * 更新连接的心跳时间
   *
   * @param tenantId 租户ID
   * @param userId 用户ID
   */
  updateHeartbeat(tenantId: string, userId: string): void {
    const tenantConnections = this.connections.get(tenantId);
    if (!tenantConnections) return;

    const userConnections = tenantConnections.get(userId);
    if (!userConnections) return;

    const now = new Date();
    userConnections.forEach((connection) => {
      connection.lastHeartbeat = now;
    });
  }

  /**
   * 启动心跳检测
   * 定期清理超时的连接
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = new Date();
      const timeout = this.CONNECTION_TIMEOUT;

      // 遍历所有连接，检查是否超时
      this.connections.forEach((tenantConnections, tenantId) => {
        tenantConnections.forEach((userConnections, userId) => {
          userConnections.forEach((connection) => {
            // 发送心跳消息
            this.sendToConnection(connection, {
              event: 'heartbeat',
              data: {
                timestamp: now.toISOString(),
              },
            });

            // 检查是否超时
            const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
            if (timeSinceLastHeartbeat > timeout) {
              this.logger.warn(
                `连接超时，将移除: 租户=${tenantId}, 用户=${userId}, ` +
                `超时=${Math.round(timeSinceLastHeartbeat / 1000)}秒`
              );
              connection.response.end();
              this.remove(tenantId, userId, connection);
            }
          });
        });
      });
    }, this.HEARTBEAT_INTERVAL);

    this.logger.log(`心跳检测已启动，间隔=${this.HEARTBEAT_INTERVAL}ms`);
  }

  /**
   * 设置 SSE 响应头
   *
   * @param response Express 响应对象
   */
  private setSseHeaders(response: Response): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲
    response.flushHeaders();
  }

  /**
   * 关闭所有连接
   */
  private closeAllConnections(): void {
    this.connections.forEach((tenantConnections, tenantId) => {
      tenantConnections.forEach((userConnections, userId) => {
        userConnections.forEach((connection) => {
          try {
            connection.response.end();
          } catch (error) {
            this.logger.error(`关闭连接失败: ${tenantId}/${userId}`, error);
          }
        });
      });
    });
    this.connections.clear();
    this.logger.log('所有连接已关闭');
  }

  /**
   * 获取总连接数
   */
  getTotalConnectionCount(): number {
    let count = 0;
    this.connections.forEach((tenantConnections) => {
      tenantConnections.forEach((userConnections) => {
        count += userConnections.size;
      });
    });
    return count;
  }

  /**
   * 获取租户的连接数
   */
  getTenantConnectionCount(tenantId: string): number {
    const tenantConnections = this.connections.get(tenantId);
    if (!tenantConnections) return 0;

    let count = 0;
    tenantConnections.forEach((userConnections) => {
      count += userConnections.size;
    });
    return count;
  }

  /**
   * 获取用户的连接数
   */
  getUserConnectionCount(tenantId: string, userId: string): number {
    const tenantConnections = this.connections.get(tenantId);
    if (!tenantConnections) return 0;

    const userConnections = tenantConnections.get(userId);
    return userConnections?.size || 0;
  }

  /**
   * 获取所有连接统计信息
   */
  getStats(): {
    totalConnections: number;
    tenantCount: number;
    tenants: Array<{ tenantId: string; userCount: number; connectionCount: number }>;
  } {
    const tenants: Array<{ tenantId: string; userCount: number; connectionCount: number }> = [];

    this.connections.forEach((tenantConnections, tenantId) => {
      let userCount = 0;
      let connectionCount = 0;

      tenantConnections.forEach((userConnections) => {
        userCount++;
        connectionCount += userConnections.size;
      });

      tenants.push({ tenantId, userCount, connectionCount });
    });

    return {
      totalConnections: this.getTotalConnectionCount(),
      tenantCount: this.connections.size,
      tenants,
    };
  }
}
