import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { NotificationsService } from './services/notifications.service';
import { SseConnectionManager } from './services/sse-connection.manager';
import { SendNotificationDto, SendToUsersDto, SendToRoleDto } from './dto/send-notification.dto';
import { QueryNotificationsDto, MarkAsReadDto } from './dto/query-notification.dto';
import { NotificationResponseDto, UnreadCountResponseDto } from './dto/notification-response.dto';
import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from './interfaces/notification-type.enum';

/**
 * 通知控制器
 *
 * 提供：
 * - SSE 订阅端点：客户端连接接收实时通知
 * - REST API：发送通知、查询通知、标记已读、统计未读
 */
@ApiTags('通知管理 (实时通信)')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  description: '租户ID',
  required: false,
})
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sseConnectionManager: SseConnectionManager,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * SSE 订阅端点
   *
   * 客户端通过此端点建立 SSE 连接，接收实时通知
   *
   * 连接时需要提供：
   * - Authorization: Bearer <token>
   * - x-tenant-id: <租户ID>
   *
   * 前端示例：
   * ```typescript
   * const eventSource = new EventSource('/api/notifications/subscribe', {
   *   headers: {
   *     'Authorization': 'Bearer xxx',
   *     'x-tenant-id': 'tenant-001'
   *   }
   * });
   * eventSource.onmessage = (event) => {
   *   const notification = JSON.parse(event.data);
   *   console.log('收到通知:', notification);
   * };
   * ```
   */
  @Get('subscribe')
  @Public() // 公开接口，手动验证 JWT
  @ApiOperation({ summary: 'SSE 订阅通知（实时推送）' })
  @ApiResponse({
    status: 200,
    description: 'SSE 连接已建立，开始推送通知',
    schema: {
      type: 'object',
      properties: {
        event: { type: 'string', example: 'connected' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  })
  async subscribe(
    @Headers('x-tenant-id') headerTenantId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    let userId: string;
    let tenantId: string;

    try {
      // 1. 尝试从 cookie 中的 wms_token 获取 JWT
      const cookies = req.headers.cookie || '';
      const cookieMatch = cookies.match(/wms_token=([^;]+)/);

      let token: string | undefined;

      if (cookieMatch) {
        token = cookieMatch[1];
      } else {
        // 2. 如果 cookie 中没有，尝试从 Authorization header 获取
        const authHeader = req.headers.authorization || '';
        const bearerMatch = authHeader.match(/Bearer\s+(.+)/);
        token = bearerMatch?.[1];
      }

      if (!token) {
        res.status(401).json({ message: '未授权：缺少认证令牌' });
        return;
      }

      // 3. 验证 JWT 并提取用户信息
      const payload = this.jwtService.verify(token);
      userId = payload.userId || payload.sub;
      tenantId = payload.tenantId || headerTenantId;

      if (!userId) {
        res.status(401).json({ message: '未授权：无效的用户信息' });
        return;
      }

      if (!tenantId) {
        res.status(400).json({ message: '缺少租户ID' });
        return;
      }
    } catch (error) {
      this.logger.error('JWT 验证失败', error);
      res.status(401).json({ message: '未授权：令牌无效或已过期' });
      return;
    }

    this.logger.log(`新 SSE 连接请求: 租户=${tenantId}, 用户=${userId}`);

    // 注册 SSE 连接
    this.sseConnectionManager.register(tenantId, userId, res);
  }

  /**
   * 发送广播通知
   *
   * 发送给租户内所有用户
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送广播通知（租户内所有用户）' })
  @ApiResponse({ status: 200, description: '通知已发送' })
  async sendBroadcast(@Body() dto: SendNotificationDto): Promise<any> {
    const notification = await this.notificationsService.send(dto);
    return {
      message: '广播通知已发送',
      notification,
    };
  }

  /**
   * 发送给指定用户
   *
   * 发送给 userIds 列表中的用户
   */
  @Post('send-to-users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送通知给指定用户' })
  @ApiResponse({ status: 200, description: '通知已发送' })
  async sendToUsers(@Body() dto: SendToUsersDto): Promise<any> {
    const notifications = await this.notificationsService.sendToUsers(dto);

    return {
      message: `已发送给 ${dto.userIds.length} 个用户`,
      count: notifications.length,
      notifications,
    };
  }

  /**
   * 发送给指定角色
   *
   * 发送给拥有该角色的所有用户
   */
  @Post('send-to-role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送通知给指定角色的所有用户' })
  @ApiResponse({ status: 200, description: '通知已发送' })
  async sendToRole(@Body() dto: SendToRoleDto): Promise<any> {
    // TODO: 查询拥有该角色的用户列表
    // 这里需要注入 RolesService 来获取用户列表
    // 暂时返回空数组，实际使用时需要实现
    const roleUserIds: string[] = [];

    const notifications = await this.notificationsService.sendToRole(
      dto.tenantId,
      dto.roleCode,
      dto,
      roleUserIds,
    );

    return {
      message: `已发送给角色 ${dto.roleCode} 的 ${notifications.length} 个用户`,
      count: notifications.length,
      notifications,
    };
  }

  /**
   * 查询通知列表
   *
   * 获取当前用户的通知历史记录
   */
  @Post('list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询通知列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getNotifications(
    @Body() dto: QueryNotificationsDto,
    @Req() req: Request,
  ): Promise<{
    list: NotificationResponseDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    const { data, total } = await this.notificationsService.findByUser(tenantId, userId, {
      page: dto.page,
      pageSize: dto.pageSize,
      unreadOnly: dto.unreadOnly,
      type: dto.type,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    return {
      list: data as any,
      total,
      page: dto.page || 1,
      pageSize: dto.pageSize || 20,
    };
  }

  /**
   * 标记已读
   *
   * 标记通知为已读状态
   */
  @Post('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记通知为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAsRead(@Body() dto: MarkAsReadDto, @Req() req: Request): Promise<{ message: string }> {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    await this.notificationsService.markAsRead(tenantId, userId, dto.notificationId);

    return {
      message: dto.notificationId ? '通知已标记为已读' : '所有通知已标记为已读',
    };
  }

  /**
   * 获取未读数量
   *
   * 获取当前用户的未读通知统计
   */
  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取未读通知统计' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getUnreadCount(@Req() req: Request): Promise<UnreadCountResponseDto> {
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const tenantId = (req as any).user?.tenantId;

    const count = await this.notificationsService.getUnreadCount(tenantId, userId);

    return count as any;
  }

  /**
   * 获取连接统计
   *
   * 获取当前 SSE 连接的统计信息（用于监控）
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取连接统计（管理员用）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getStats(): Promise<{
    totalConnections: number;
    tenantCount: number;
    tenants: Array<{ tenantId: string; userCount: number; connectionCount: number }>;
  }> {
    return this.sseConnectionManager.getStats();
  }

  /**
   * 公开咨询接口
   *
   * 供官网等公开场景使用，接收访客咨询并实时通知客服
   * 不需要登录认证
   */
  @Post('public/consultation')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '提交咨询（公开接口）',
    description: '供官网等公开场景使用，接收访客咨询并实时通知客服，无需登录',
  })
  @ApiResponse({ status: 200, description: '咨询已提交' })
  async submitConsultation(
    @Body() dto: import('./dto/public-consultation.dto').PublicConsultationDto,
  ): Promise<{
    id: string;
    message: string;
    expectedResponseTime: string;
  }> {
    // 生成咨询ID
    const consultationId = `consult-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 构建咨询信息
    const consultationInfo = {
      id: consultationId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      company: dto.company,
      consultationType: dto.consultationType,
      message: dto.message,
      productSku: dto.productSku,
      productName: dto.productName,
      source: dto.source || '官网',
      extraData: dto.extraData,
      submittedAt: new Date().toISOString(),
    };

    // TODO: 根据租户配置获取客服用户ID列表
    // 这里可以：
    // 1. 从租户配置中读取指定的客服用户ID
    // 2. 从数据库查询该租户的客服角色用户
    // 3. 使用固定的客服用户ID列表
    // 临时方案：如果 DTO 中提供了客服用户ID，则使用；否则发送广播
    const customerServiceIds = (dto.extraData?.customerServiceIds as string[]) || [];

    if (customerServiceIds.length > 0) {
      // 发送通知给指定客服
      await this.notificationsService.sendToUsers({
        tenantId: dto.tenantId,
        userIds: customerServiceIds,
        type: NotificationType.MESSAGE,
        category: NotificationCategory.CONSULTATION,
        title: `新用户咨询 - ${dto.name}`,
        message: `收到来自${dto.company || dto.name}的咨询：${dto.message}`,
        data: {
          ...consultationInfo,
        },
        priority: NotificationPriority.HIGH,
      });
    } else {
      // 没有指定客服，发送广播通知给该租户
      await this.notificationsService.send({
        tenantId: dto.tenantId,
        type: NotificationType.MESSAGE,
        category: NotificationCategory.CONSULTATION,
        title: `新用户咨询 - ${dto.name}`,
        message: `收到来自${dto.company || dto.name}的咨询：${dto.message}`,
        data: {
          ...consultationInfo,
        },
        priority: NotificationPriority.HIGH,
      });
    }

    this.logger.log(
      `收到公开咨询: 租户=${dto.tenantId}, 姓名=${dto.name}, 电话=${dto.phone}, 咨询类型=${dto.consultationType || '未分类'}`,
    );

    return {
      id: consultationId,
      message: '咨询已提交，我们会尽快与您联系',
      expectedResponseTime: '工作时间内2小时内',
    };
  }
}
