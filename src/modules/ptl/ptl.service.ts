import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { RedisService } from '@/modules/redis/redis.service';
import { Device, DeviceStatus, DeviceType } from '@/modules/location/entities/device.entity';
import { InventoryLocation } from '@/modules/location/entities/inventory-location.entity';
import { Location } from '@/modules/location/entities/location.entity';
import { Product } from '@/modules/product/product.entity';
import { SseConnectionManager } from '@/modules/notifications/services/sse-connection.manager';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from '@/modules/notifications/interfaces/notification-type.enum';
import { PtlLocationBinding } from './entities/ptl-location-binding.entity';
import {
  PtlPickTask,
  PtlPickTaskSource,
  PtlPickTaskStatus,
} from './entities/ptl-pick-task.entity';
import {
  PtlPickTaskItem,
  PtlPickTaskItemStatus,
} from './entities/ptl-pick-task-item.entity';
import {
  CalibrateDto,
  ConfirmPtlDto,
  LightUpDto,
  SavePtlBindingDto,
  SavePtlControllerDto,
} from './dto/ptl.dto';
import { PtlCommandGateway, PtlDeviceEvent } from './ptl-command.gateway';

const ACTIVE_TASK_STATUSES = [
  PtlPickTaskStatus.CREATED,
  PtlPickTaskStatus.LIGHTING,
  PtlPickTaskStatus.ACTIVE,
  PtlPickTaskStatus.PARTIAL_CONFIRMED,
];

const ACTIVE_ITEM_STATUSES = [
  PtlPickTaskItemStatus.PENDING,
  PtlPickTaskItemStatus.LIGHTING,
  PtlPickTaskItemStatus.ACTIVE,
];

/** 找货指引色：蓝色闪烁，盖在常驻库存底色之上 */
const FIND_BLINK_COLOR = 'blue';

/** 库存底色 = 严重度最高的那个（红>黄>绿）；用于多 SKU 共用库位时取最告急的颜色 */
type StockColor = 'green' | 'yellow' | 'red';
const STOCK_COLOR_SEVERITY: Record<StockColor, number> = { green: 1, yellow: 2, red: 3 };

@Injectable()
export class PtlService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PtlService.name);
  private offlineTimer: NodeJS.Timeout | null = null;
  /** 本进程已同步过底色的控制器；进程重启后清空，第一次心跳即重新下发底色 */
  private readonly syncedDeviceIds = new Set<string>();

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(InventoryLocation)
    private readonly inventoryLocationRepository: Repository<InventoryLocation>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(PtlLocationBinding)
    private readonly bindingRepository: Repository<PtlLocationBinding>,
    @InjectRepository(PtlPickTask)
    private readonly taskRepository: Repository<PtlPickTask>,
    @InjectRepository(PtlPickTaskItem)
    private readonly taskItemRepository: Repository<PtlPickTaskItem>,
    private readonly redisService: RedisService,
    private readonly commandGateway: PtlCommandGateway,
    private readonly sseConnectionManager: SseConnectionManager,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // 注册设备上报事件处理器（心跳/按钮/ACK）
    this.commandGateway.setEventHandler((event) => this.handleDeviceEvent(event));
    // 启动离线巡检
    const timeoutSec = this.configService.get<number>('ptl.heartbeatTimeoutSeconds') || 60;
    this.offlineTimer = setInterval(() => {
      this.sweepOfflineDevices(timeoutSec).catch((e) =>
        this.logger.error(`PTL 离线巡检失败: ${e?.message || e}`),
      );
      this.sweepExpiredTasks().catch((e) =>
        this.logger.error(`PTL 过期任务清理失败: ${e?.message || e}`),
      );
    }, 30000);
    if (this.offlineTimer.unref) this.offlineTimer.unref();
  }

  onModuleDestroy() {
    if (this.offlineTimer) {
      clearInterval(this.offlineTimer);
      this.offlineTimer = null;
    }
  }

  async findControllers(tenantId: string) {
    return this.deviceRepository.find({
      where: { tenantId, type: DeviceType.PTL_CONTROLLER },
      order: { createdAt: 'ASC' },
    });
  }

  async saveController(tenantId: string, dto: SavePtlControllerDto) {
    const existing = dto.id
      ? await this.deviceRepository.findOne({ where: { id: dto.id, tenantId } })
      : null;

    if (dto.id && !existing) {
      throw new NotFoundException('PTL 控制器不存在');
    }

    const duplicated = await this.deviceRepository.findOne({
      where: {
        tenantId,
        code: dto.code,
        ...(dto.id ? { id: Not(dto.id) } : {}),
      },
    });
    if (duplicated) {
      throw new BadRequestException(`控制器编码 ${dto.code} 已存在`);
    }

    const entity = this.deviceRepository.create({
      ...(existing || {}),
      tenantId,
      code: dto.code,
      name: dto.name,
      deviceUid: dto.deviceUid,
      type: DeviceType.PTL_CONTROLLER,
      status: existing?.status || DeviceStatus.OFFLINE,
      config: {
        protocol: 'MQTT',
        ...(existing?.config || {}),
        ...(dto.config || {}),
      },
      metadata: {
        ...(existing?.metadata || {}),
        ...(dto.metadata || {}),
      },
      remark: dto.remark,
    });

    return this.deviceRepository.save(entity);
  }

  async removeController(tenantId: string, id: string) {
    const bindingCount = await this.bindingRepository.count({
      where: { tenantId, deviceId: id, enabled: 1 },
    });
    if (bindingCount > 0) {
      throw new BadRequestException('控制器存在库位灯绑定，需先解绑');
    }
    await this.deviceRepository.delete({ id, tenantId, type: DeviceType.PTL_CONTROLLER });
    return { success: true };
  }

  async getControllerStatus(tenantId: string) {
    const controllers = await this.findControllers(tenantId);
    return controllers.map((controller) => ({
      id: controller.id,
      code: controller.code,
      name: controller.name,
      status: controller.status,
      lastHeartbeat: controller.lastHeartbeat,
      deviceUid: controller.deviceUid,
      metadata: controller.metadata,
    }));
  }

  async findBindings(tenantId: string, options: { locationId?: string; deviceId?: string } = {}) {
    return this.bindingRepository.find({
      where: {
        tenantId,
        ...(options.locationId ? { locationId: options.locationId } : {}),
        ...(options.deviceId ? { deviceId: options.deviceId } : {}),
      },
      relations: ['location', 'device'],
      order: { createdAt: 'ASC' },
    });
  }

  async saveBinding(tenantId: string, dto: SavePtlBindingDto) {
    const [location, device] = await Promise.all([
      this.locationRepository.findOne({ where: { id: dto.locationId, tenantId } }),
      this.deviceRepository.findOne({
        where: { id: dto.deviceId, tenantId, type: DeviceType.PTL_CONTROLLER },
      }),
    ]);

    if (!location) throw new NotFoundException('库位不存在');
    if (!device) throw new NotFoundException('PTL 控制器不存在');

    await this.assertLocationNotActive(tenantId, dto.locationId);

    const existing = dto.id
      ? await this.bindingRepository.findOne({ where: { id: dto.id, tenantId } })
      : null;
    if (dto.id && !existing) {
      throw new NotFoundException('库位灯绑定不存在');
    }

    const duplicatedLocation = await this.bindingRepository.findOne({
      where: {
        tenantId,
        locationId: dto.locationId,
        ...(dto.id ? { id: Not(dto.id) } : {}),
      },
    });
    if (duplicatedLocation) {
      throw new BadRequestException('该库位已绑定货位灯');
    }

    const duplicatedLed = await this.bindingRepository.findOne({
      where: {
        tenantId,
        deviceId: dto.deviceId,
        ledIndex: dto.ledIndex,
        ...(dto.id ? { id: Not(dto.id) } : {}),
      },
    });
    if (duplicatedLed) {
      throw new BadRequestException('该控制器灯序号已绑定库位');
    }

    const binding = this.bindingRepository.create({
      ...(existing || {}),
      tenantId,
      locationId: dto.locationId,
      deviceId: dto.deviceId,
      ledIndex: dto.ledIndex,
      defaultColor: dto.defaultColor || existing?.defaultColor || 'blue',
      enabled: dto.enabled === false ? 0 : 1,
      remark: dto.remark,
    });

    return this.bindingRepository.save(binding);
  }

  async removeBinding(tenantId: string, id: string) {
    const binding = await this.bindingRepository.findOne({ where: { id, tenantId } });
    if (!binding) {
      throw new NotFoundException('库位灯绑定不存在');
    }
    await this.assertLocationNotActive(tenantId, binding.locationId);
    await this.bindingRepository.delete({ id, tenantId });
    return { success: true };
  }

  async calibrate(tenantId: string, controllerId: string, dto: CalibrateDto) {
    const device = await this.deviceRepository.findOne({
      where: { id: controllerId, tenantId, type: DeviceType.PTL_CONTROLLER },
    });
    if (!device) {
      throw new NotFoundException('PTL 控制器不存在');
    }

    const duration = dto.duration || 5;
    const requestId = this.createRequestId();
    const result = await this.commandGateway.send(device, {
      requestId,
      action: 'calibrate',
      index: dto.ledIndex,
      color: dto.color || 'blue',
      mode: 'blink',
      timeout: duration,
    });

    // 校准闪烁结束后，若该灯绑定了库位则恢复常驻库存底色（否则保持灭）
    const binding = await this.bindingRepository.findOne({
      where: { tenantId, deviceId: device.id, ledIndex: dto.ledIndex, enabled: 1 },
    });
    if (binding) {
      const timer = setTimeout(() => {
        this.revertToBaseColor(tenantId, device, binding.locationId, dto.ledIndex).catch((e) =>
          this.logger.warn(`校准后恢复底色失败: ${e?.message || e}`),
        );
      }, duration * 1000 + 300);
      if (timer.unref) timer.unref();
    }

    return {
      requestId,
      deviceId: device.id,
      ledIndex: dto.ledIndex,
      ...result,
    };
  }

  async lightUp(tenantId: string, userId: string, dto: LightUpDto) {
    if (!dto.sku && (!dto.locationIds || dto.locationIds.length === 0)) {
      throw new BadRequestException('sku 和 locationIds 至少传一个');
    }

    if (dto.sku) {
      const existing = await this.taskRepository.findOne({
        where: {
          tenantId,
          requestedBy: userId,
          sku: dto.sku,
          status: In(ACTIVE_TASK_STATUSES),
        },
        relations: ['items'],
        order: { createdAt: 'ASC' },
      });
      if (existing) {
        return {
          reused: true,
          taskId: existing.id,
          task: existing,
        };
      }
    }

    const candidates = await this.findLightUpCandidates(tenantId, dto);
    if (candidates.length === 0) {
      throw new BadRequestException('未找到可点亮的有货库位');
    }

    const availableCandidates = [];
    const skipped = [];
    for (const candidate of candidates) {
      const activeTaskId = await this.getActiveLocationTaskId(tenantId, candidate.locationId);
      if (activeTaskId) {
        skipped.push({
          locationId: candidate.locationId,
          reason: 'OCCUPIED',
          occupiedByTaskId: activeTaskId,
        });
        continue;
      }
      if (!candidate.binding || !candidate.device) {
        skipped.push({ locationId: candidate.locationId, reason: 'UNBOUND' });
        continue;
      }
      if (candidate.device.status !== DeviceStatus.ONLINE) {
        skipped.push({ locationId: candidate.locationId, reason: 'OFFLINE' });
        continue;
      }
      availableCandidates.push(candidate);
    }

    if (availableCandidates.length === 0) {
      throw new BadRequestException({
        message: '全部库位均无法点亮',
        skipped,
      });
    }

    const ttlSeconds = dto.ttlSeconds || 600;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const first = availableCandidates[0];
    const task = await this.taskRepository.save(
      this.taskRepository.create({
        tenantId,
        taskNo: this.createTaskNo(),
        sku: dto.sku || first.sku,
        productName: first.productName,
        status: PtlPickTaskStatus.CREATED,
        source: PtlPickTaskSource.APP,
        requestedBy: userId,
        totalLocations: availableCandidates.length,
        confirmedLocations: 0,
        ttlSeconds,
        expiresAt,
        metadata: { skipped },
      }),
    );

    const items = await this.taskItemRepository.save(
      availableCandidates.map((candidate) =>
        this.taskItemRepository.create({
          tenantId,
          taskId: task.id,
          locationId: candidate.locationId,
          locationCode: candidate.locationCode,
          inventoryLocationId: candidate.inventoryLocationId,
          deviceId: candidate.binding.deviceId,
          ledIndex: candidate.binding.ledIndex,
          status: PtlPickTaskItemStatus.PENDING,
          quantity: candidate.quantity,
          availableQuantity: candidate.availableQuantity,
          batchNo: candidate.batchNo,
          expiryDate: candidate.expiryDate,
        }),
      ),
    );

    for (const item of items) {
      await this.setActiveLocation(tenantId, item.locationId, task.id, ttlSeconds);
    }

    task.status = PtlPickTaskStatus.LIGHTING;
    await this.taskRepository.save(task);

    const commandResults = [];
    for (const item of items) {
      const candidate = availableCandidates.find((entry) => entry.locationId === item.locationId);
      const requestId = this.createRequestId();
      item.requestId = requestId;
      item.status = PtlPickTaskItemStatus.LIGHTING;
      await this.taskItemRepository.save(item);

      // 找货统一蓝色闪烁，盖在常驻库存底色之上；确认/取消后再恢复底色
      const result = await this.commandGateway.send(candidate.device, {
        requestId,
        action: 'on',
        taskId: task.id,
        index: item.ledIndex,
        color: dto.color || FIND_BLINK_COLOR,
        mode: 'blink',
        timeout: ttlSeconds,
      });

      if (result.success) {
        item.status = PtlPickTaskItemStatus.ACTIVE;
        item.ackAt = result.ackAt || new Date();
      } else {
        item.status = PtlPickTaskItemStatus.FAILED;
        item.errorMessage = result.errorMessage || '点灯失败';
        await this.releaseActiveLocation(tenantId, item.locationId);
      }
      await this.taskItemRepository.save(item);
      commandResults.push({ itemId: item.id, locationId: item.locationId, ...result });
    }

    const activeCount = await this.taskItemRepository.count({
      where: { taskId: task.id, status: PtlPickTaskItemStatus.ACTIVE },
    });
    task.status = activeCount > 0 ? PtlPickTaskStatus.ACTIVE : PtlPickTaskStatus.FAILED;
    if (activeCount === 0) {
      task.errorMessage = '全部库位点灯失败';
      task.closedAt = new Date();
    }
    await this.taskRepository.save(task);
    await this.redisService.set(`ptl:task:${task.id}`, { ...task, commandResults }, ttlSeconds);

    return {
      taskId: task.id,
      task,
      items: await this.taskItemRepository.find({ where: { taskId: task.id } }),
      skipped,
      commandResults,
    };
  }

  async lightOff(tenantId: string, taskId: string) {
    const task = await this.getTaskOrFail(tenantId, taskId);
    if (!ACTIVE_TASK_STATUSES.includes(task.status)) {
      return { taskId, status: task.status, success: true };
    }

    const items = await this.taskItemRepository.find({ where: { tenantId, taskId } });
    for (const item of items) {
      if (item.status === PtlPickTaskItemStatus.ACTIVE) {
        const device = item.deviceId
          ? await this.deviceRepository.findOne({ where: { id: item.deviceId, tenantId } })
          : null;
        if (device) {
          // 取消找货后恢复常驻库存底色（而非灭灯）
          await this.revertToBaseColor(tenantId, device, item.locationId, item.ledIndex);
        }
      }
      if (ACTIVE_ITEM_STATUSES.includes(item.status)) {
        item.status = PtlPickTaskItemStatus.CANCELLED;
        await this.taskItemRepository.save(item);
      }
      await this.releaseActiveLocation(tenantId, item.locationId);
    }

    task.status = PtlPickTaskStatus.CANCELLED;
    task.closedAt = new Date();
    await this.taskRepository.save(task);
    await this.redisService.del(`ptl:task:${task.id}`);

    return { taskId, status: task.status, success: true };
  }

  async confirm(tenantId: string, userId: string, dto: ConfirmPtlDto) {
    const task = await this.getTaskOrFail(tenantId, dto.taskId);
    if (!ACTIVE_TASK_STATUSES.includes(task.status)) {
      throw new BadRequestException('任务已结束');
    }

    const query = this.taskItemRepository
      .createQueryBuilder('item')
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.taskId = :taskId', { taskId: dto.taskId });

    if (dto.locationId) {
      query.andWhere('item.locationId = :locationId', { locationId: dto.locationId });
    } else if (dto.locationCode) {
      query.andWhere('item.locationCode = :locationCode', { locationCode: dto.locationCode });
    } else {
      throw new BadRequestException('locationId 或 locationCode 至少传一个');
    }

    const item = await query.getOne();
    if (!item) {
      throw new BadRequestException('货位不属于当前任务');
    }

    if (dto.skuOrBarcode && dto.skuOrBarcode !== task.sku) {
      throw new BadRequestException('产品与当前找货任务不一致');
    }

    if (item.status === PtlPickTaskItemStatus.CONFIRMED) {
      return { taskId: task.id, itemId: item.id, status: item.status, success: true };
    }

    if (!ACTIVE_ITEM_STATUSES.includes(item.status)) {
      throw new BadRequestException('该库位不可确认');
    }

    return this.applyConfirm(tenantId, task, item, userId);
  }

  /**
   * 执行单个库位的确认：灭灯 + 更新明细/任务状态 + 释放占用 + SSE 推送。
   * 供 App 扫码确认与硬件按钮确认共用。
   */
  private async applyConfirm(
    tenantId: string,
    task: PtlPickTask,
    item: PtlPickTaskItem,
    userId: string | null,
    options: { sendOff?: boolean } = {},
  ) {
    if (item.status === PtlPickTaskItemStatus.CONFIRMED) {
      return {
        taskId: task.id,
        itemId: item.id,
        status: item.status,
        taskStatus: task.status,
        success: true,
      };
    }

    if (options.sendOff !== false && item.deviceId) {
      const device = await this.deviceRepository.findOne({
        where: { id: item.deviceId, tenantId },
      });
      if (device) {
        // 确认后不灭灯，恢复成常驻库存底色
        await this.revertToBaseColor(tenantId, device, item.locationId, item.ledIndex);
      }
    }

    item.status = PtlPickTaskItemStatus.CONFIRMED;
    item.confirmedAt = new Date();
    item.confirmedBy = userId;
    await this.taskItemRepository.save(item);
    await this.releaseActiveLocation(tenantId, item.locationId);

    const confirmedCount = await this.taskItemRepository.count({
      where: { tenantId, taskId: task.id, status: PtlPickTaskItemStatus.CONFIRMED },
    });
    task.confirmedLocations = confirmedCount;
    task.status =
      confirmedCount >= task.totalLocations
        ? PtlPickTaskStatus.COMPLETED
        : PtlPickTaskStatus.PARTIAL_CONFIRMED;
    if (task.status === PtlPickTaskStatus.COMPLETED) {
      task.closedAt = new Date();
      await this.redisService.del(`ptl:task:${task.id}`);
    } else {
      await this.redisService.set(`ptl:task:${task.id}`, task, task.ttlSeconds);
    }
    await this.taskRepository.save(task);

    this.pushConfirmSse(task, item);

    return { taskId: task.id, itemId: item.id, status: item.status, taskStatus: task.status };
  }

  /** 通过 SSE 把确认结果推给发起任务的用户（App 实时更新卡片状态） */
  private pushConfirmSse(task: PtlPickTask, item: PtlPickTaskItem) {
    if (!task.requestedBy) return;
    try {
      this.sseConnectionManager.sendToUsers(task.tenantId, [task.requestedBy], {
        id: this.createRequestId(),
        tenantId: task.tenantId,
        userId: task.requestedBy,
        type: NotificationType.SYSTEM,
        // 用系统公告分类，避免被库存变更通知处理逻辑误识别
        category: NotificationCategory.SYSTEM_ANNOUNCEMENT,
        title: 'PTL 找货确认',
        message: `库位 ${item.locationCode} 已确认`,
        priority: NotificationPriority.NORMAL,
        createdAt: new Date().toISOString(),
        data: {
          event: 'ptl_confirmed',
          taskId: task.id,
          itemId: item.id,
          locationId: item.locationId,
          locationCode: item.locationCode,
          taskStatus: task.status,
        },
      });
    } catch (e: any) {
      this.logger.warn(`PTL SSE 推送失败: ${e?.message || e}`);
    }
  }

  // ============ 设备上报事件处理（心跳 / ACK / 按钮）============

  async handleDeviceEvent(event: PtlDeviceEvent) {
    const { tenantId, deviceCode, type, raw } = event;
    const device = await this.deviceRepository.findOne({
      where: { tenantId, code: deviceCode, type: DeviceType.PTL_CONTROLLER },
    });
    if (!device) {
      this.logger.warn(`收到未知 PTL 控制器事件: ${tenantId}/${deviceCode} (${type})`);
      return;
    }

    // 任何上报都说明设备在线
    const wasOffline = device.status !== DeviceStatus.ONLINE;
    await this.deviceRepository.update(
      { id: device.id, tenantId },
      { status: DeviceStatus.ONLINE, lastHeartbeat: new Date() },
    );

    // 补发常驻库存底色，任一情况触发：
    //  - 设备离线→上线（设备重启灯被清空）
    //  - 显式 online 上报
    //  - 后端进程启动后第一次见到该设备（重启后内存集合为空）
    if (wasOffline || type === 'online' || !this.syncedDeviceIds.has(device.id)) {
      this.syncedDeviceIds.add(device.id);
      this.syncDeviceBaseColors(tenantId, device).catch((e) =>
        this.logger.warn(`PTL 底色同步失败: ${e?.message || e}`),
      );
    }

    if (type === 'ack') {
      await this.handleAck(tenantId, raw);
    } else if (type === 'button') {
      const index = Number(raw.index);
      if (!Number.isNaN(index)) {
        await this.handleButton(tenantId, device.id, index);
      }
    }
  }

  /** 控制器真实 ACK：标记对应明细已送达 */
  private async handleAck(tenantId: string, raw: Record<string, any>) {
    const requestId = raw.requestId;
    if (!requestId) return;
    const item = await this.taskItemRepository.findOne({ where: { tenantId, requestId } });
    if (!item) return;
    item.ackAt = new Date();
    if (item.status === PtlPickTaskItemStatus.LIGHTING) {
      item.status = PtlPickTaskItemStatus.ACTIVE;
    }
    await this.taskItemRepository.save(item);
  }

  /** 硬件按钮确认：按 控制器+灯序号 找到活跃明细并确认 */
  private async handleButton(tenantId: string, deviceId: string, ledIndex: number) {
    const item = await this.taskItemRepository.findOne({
      where: { tenantId, deviceId, ledIndex, status: In(ACTIVE_ITEM_STATUSES) },
      order: { createdAt: 'ASC' },
    });
    if (!item) {
      this.logger.debug(`按钮事件无匹配活跃任务: device=${deviceId} led=${ledIndex}`);
      return;
    }
    const task = await this.taskRepository.findOne({
      where: { id: item.taskId, tenantId },
    });
    if (!task) return;
    // 按钮确认时设备已本地灭灯，仍下发 off 兜底
    await this.applyConfirm(tenantId, task, item, null, { sendOff: true });
  }

  /** 离线巡检：超过心跳超时未上报的控制器置为离线 */
  private async sweepOfflineDevices(timeoutSeconds: number) {
    const threshold = new Date(Date.now() - timeoutSeconds * 1000);
    await this.deviceRepository
      .createQueryBuilder()
      .update(Device)
      .set({ status: DeviceStatus.OFFLINE })
      .where('type = :type', { type: DeviceType.PTL_CONTROLLER })
      .andWhere('status = :online', { online: DeviceStatus.ONLINE })
      .andWhere('(lastHeartbeat IS NULL OR lastHeartbeat < :threshold)', { threshold })
      .execute();
  }

  /** 过期任务清理：TTL 到期的活跃任务置为 EXPIRED，活跃明细一并过期（Redis 占用锁已自动过期） */
  private async sweepExpiredTasks() {
    const now = new Date();

    // 先抓出即将过期的活跃明细，过期后要把这些灯从蓝闪恢复成常驻底色
    const expiringItems = await this.taskItemRepository
      .createQueryBuilder('item')
      .where('item.status IN (:...itemStatuses)', { itemStatuses: ACTIVE_ITEM_STATUSES })
      .andWhere(
        'item.taskId IN (SELECT id FROM ptl_pick_tasks WHERE status IN (:...taskStatuses) AND expiresAt < :now)',
        { taskStatuses: ACTIVE_TASK_STATUSES, now },
      )
      .getMany();

    // 先把到期任务下的活跃明细置为 EXPIRED（用子查询锁定这些任务）
    await this.taskItemRepository
      .createQueryBuilder()
      .update(PtlPickTaskItem)
      .set({ status: PtlPickTaskItemStatus.EXPIRED })
      .where('status IN (:...itemStatuses)', { itemStatuses: ACTIVE_ITEM_STATUSES })
      .andWhere(
        'taskId IN (SELECT id FROM ptl_pick_tasks WHERE status IN (:...taskStatuses) AND expiresAt < :now)',
        { taskStatuses: ACTIVE_TASK_STATUSES, now },
      )
      .execute();

    // 再把任务本身置为 EXPIRED
    await this.taskRepository
      .createQueryBuilder()
      .update(PtlPickTask)
      .set({ status: PtlPickTaskStatus.EXPIRED, closedAt: now })
      .where('status IN (:...statuses)', { statuses: ACTIVE_TASK_STATUSES })
      .andWhere('expiresAt < :now', { now })
      .execute();

    // 过期的找货灯恢复成常驻库存底色（设备已本地 timeout 灭灯，这里补回底色）
    for (const item of expiringItems) {
      if (!item.deviceId) continue;
      const device = await this.deviceRepository.findOne({
        where: { id: item.deviceId, tenantId: item.tenantId },
      });
      if (device && device.status === DeviceStatus.ONLINE) {
        await this.revertToBaseColor(item.tenantId, device, item.locationId, item.ledIndex).catch(
          (e) => this.logger.warn(`过期灯恢复底色失败: ${e?.message || e}`),
        );
      }
    }
  }

  async findTask(tenantId: string, taskId: string) {
    return this.getTaskOrFail(tenantId, taskId);
  }

  /**
   * 按 SKU 计算灯色：全仓总可用量(quantity-lockedQuantity) 与产品安全库存(safetyStock) 比较。
   *   总量 > 安全库存        → green  正常有库存
   *   0 < 总量 <= 安全库存   → yellow 库存告急
   *   总量 = 0               → red    库存归零
   * 安全库存为 0（未配置）时不触发告急，有货即为 green。
   */
  private async resolveStockColors(
    tenantId: string,
    skus: string[],
  ): Promise<Map<string, 'green' | 'yellow' | 'red'>> {
    const colorMap = new Map<string, 'green' | 'yellow' | 'red'>();
    const uniqueSkus = Array.from(new Set(skus.filter(Boolean)));
    if (uniqueSkus.length === 0) return colorMap;

    // 全仓每个 SKU 的总可用量
    const totalRows = await this.inventoryLocationRepository
      .createQueryBuilder('il')
      .select('il.sku', 'sku')
      .addSelect('SUM(il.quantity - il.lockedQuantity)', 'available')
      .where('il.tenantId = :tenantId', { tenantId })
      .andWhere('il.sku IN (:...skus)', { skus: uniqueSkus })
      .groupBy('il.sku')
      .getRawMany();
    const totalBySku = new Map<string, number>(
      totalRows.map((row) => [row.sku, Number(row.available || 0)]),
    );

    // 每个 SKU 的安全库存（产品编码即 SKU）
    const products = await this.productRepository.find({
      where: { tenantId, code: In(uniqueSkus) },
      select: ['code', 'safetyStock'],
    });
    const safetyBySku = new Map<string, number>(
      products.map((p) => [p.code, Number(p.safetyStock || 0)]),
    );

    for (const sku of uniqueSkus) {
      const total = totalBySku.get(sku) || 0;
      const safety = safetyBySku.get(sku) || 0;
      if (total <= 0) colorMap.set(sku, 'red');
      else if (total <= safety) colorMap.set(sku, 'yellow');
      else colorMap.set(sku, 'green');
    }
    return colorMap;
  }

  /**
   * 供其它模块（如可视化大屏）复用：按库存健康给一批库位算颜色，
   * 与物理货位灯底色同一套规则（green/yellow/red，空库位 null）。
   */
  async getLocationStockColors(
    tenantId: string,
    locationIds: string[],
  ): Promise<Map<string, StockColor | null>> {
    return this.computeLocationBaseColors(tenantId, locationIds);
  }

  /**
   * 供其它模块（如 App 找货）复用：按 SKU 全仓总量 vs 安全库存算健康色。
   * green 正常 / yellow 告急 / red 归零，与物理灯、大屏同一套规则。
   */
  async getSkuStockColors(
    tenantId: string,
    skus: string[],
  ): Promise<Map<string, StockColor>> {
    return this.resolveStockColors(tenantId, skus);
  }

  /**
   * 计算一批库位的"常驻库存底色"。
   * 库位存了多个 SKU 时取最告急的颜色（红>黄>绿）；空库位返回 null（灯灭）。
   */
  private async computeLocationBaseColors(
    tenantId: string,
    locationIds: string[],
  ): Promise<Map<string, StockColor | null>> {
    const result = new Map<string, StockColor | null>();
    const uniqueLocs = Array.from(new Set(locationIds.filter(Boolean)));
    if (uniqueLocs.length === 0) return result;
    uniqueLocs.forEach((id) => result.set(id, null)); // 默认空库位 = 灭

    // 这些库位上有货的 (库位, SKU)
    const rows = await this.inventoryLocationRepository
      .createQueryBuilder('il')
      .select('il.locationId', 'locationId')
      .addSelect('il.sku', 'sku')
      .where('il.tenantId = :tenantId', { tenantId })
      .andWhere('il.locationId IN (:...locationIds)', { locationIds: uniqueLocs })
      .andWhere('(il.quantity - il.lockedQuantity) > 0')
      .groupBy('il.locationId')
      .addGroupBy('il.sku')
      .getRawMany();

    const skuColor = await this.resolveStockColors(
      tenantId,
      rows.map((r) => r.sku),
    );

    for (const row of rows) {
      const color = skuColor.get(row.sku);
      if (!color) continue;
      const current = result.get(row.locationId);
      if (!current || STOCK_COLOR_SEVERITY[color] > STOCK_COLOR_SEVERITY[current]) {
        result.set(row.locationId, color);
      }
    }
    return result;
  }

  /** 下发常驻底色（常亮不灭）；color 为 null 表示灭灯 */
  private async pushBaseColor(device: Device, ledIndex: number, color: StockColor | null) {
    if (!color) {
      await this.commandGateway.send(device, {
        requestId: this.createRequestId(),
        action: 'off',
        index: ledIndex,
      });
      return;
    }
    await this.commandGateway.send(device, {
      requestId: this.createRequestId(),
      action: 'on',
      index: ledIndex,
      color,
      mode: 'steady', // 非 blink = 不闪，直接常亮
      timeout: 0, // 0 = 常亮不灭
    });
  }

  /** 把单个库位恢复成常驻库存底色（找货确认/取消后调用，取代单纯灭灯） */
  private async revertToBaseColor(
    tenantId: string,
    device: Device,
    locationId: string,
    ledIndex: number,
  ) {
    const colors = await this.computeLocationBaseColors(tenantId, [locationId]);
    await this.pushBaseColor(device, ledIndex, colors.get(locationId) || null);
  }

  /**
   * 把某控制器下所有绑定库位刷新成常驻库存底色。
   * 设备上线（重启后灯被清空）或库存变化后调用；正在找货的灯保持蓝色闪烁不覆盖。
   */
  async syncDeviceBaseColors(tenantId: string, device: Device) {
    const bindings = await this.bindingRepository.find({
      where: { tenantId, deviceId: device.id, enabled: 1 },
    });
    if (bindings.length === 0) {
      this.logger.warn(`底色同步跳过：控制器 ${device.code} 没有启用的库位灯绑定`);
      return;
    }

    const baseColors = await this.computeLocationBaseColors(
      tenantId,
      bindings.map((b) => b.locationId),
    );
    this.logger.log(
      `底色同步 ${device.code}: ${bindings.length} 个绑定，颜色=` +
        bindings
          .map((b) => `led${b.ledIndex}->${baseColors.get(b.locationId) || '灭(空库位)'}`)
          .join(', '),
    );

    // 正在找货的灯序号：保持蓝闪，重启后顺带补点
    const activeItems = await this.taskItemRepository.find({
      where: { tenantId, deviceId: device.id, status: In(ACTIVE_ITEM_STATUSES) },
    });
    const activeLeds = new Set(activeItems.map((i) => i.ledIndex));

    for (const binding of bindings) {
      if (activeLeds.has(binding.ledIndex)) {
        await this.commandGateway.send(device, {
          requestId: this.createRequestId(),
          action: 'on',
          index: binding.ledIndex,
          color: FIND_BLINK_COLOR,
          mode: 'blink',
          timeout: 0,
        });
      } else {
        await this.pushBaseColor(device, binding.ledIndex, baseColors.get(binding.locationId) || null);
      }
    }
  }

  /** 供前端"刷新库存灯"或库存变化后手动触发：刷新某控制器（或全部在线控制器）的底色 */
  async refreshBaseColors(tenantId: string, deviceId?: string) {
    const devices = deviceId
      ? await this.deviceRepository.find({
          where: { id: deviceId, tenantId, type: DeviceType.PTL_CONTROLLER },
        })
      : await this.deviceRepository.find({
          where: { tenantId, type: DeviceType.PTL_CONTROLLER, status: DeviceStatus.ONLINE },
        });
    for (const device of devices) {
      await this.syncDeviceBaseColors(tenantId, device);
    }
    return { success: true, count: devices.length };
  }

  /**
   * 库存变化（入/出/调整）后精准刷新底色。
   * 受影响的库位 = 改动的库位 + 全仓所有存放该 SKU 的库位
   * （因为底色按 SKU 全仓总量算，总量一变，该 SKU 的所有库位灯都可能换色）。
   * 找货中的灯不覆盖。失败不抛（不影响库存主流程）。
   */
  async refreshBaseColorsForStockChange(tenantId: string, sku: string, locationId?: string) {
    const locationIds = new Set<string>();
    if (locationId) locationIds.add(locationId);
    if (sku) {
      const rows = await this.inventoryLocationRepository.find({
        where: { tenantId, sku },
        select: ['locationId'],
      });
      rows.forEach((r) => locationIds.add(r.locationId));
    }
    if (locationIds.size === 0) return;
    await this.refreshBaseColorsForLocations(tenantId, Array.from(locationIds));
  }

  /** 刷新指定库位（绑定且控制器在线）的常驻底色；找货中的灯保持蓝闪不覆盖 */
  private async refreshBaseColorsForLocations(tenantId: string, locationIds: string[]) {
    const bindings = await this.bindingRepository.find({
      where: { tenantId, locationId: In(locationIds), enabled: 1 },
    });
    if (bindings.length === 0) return;

    const deviceIds = Array.from(new Set(bindings.map((b) => b.deviceId)));
    const devices = await this.deviceRepository.find({
      where: { id: In(deviceIds), tenantId },
    });
    const deviceMap = new Map(devices.map((d) => [d.id, d]));

    const baseColors = await this.computeLocationBaseColors(
      tenantId,
      bindings.map((b) => b.locationId),
    );

    const activeItems = await this.taskItemRepository.find({
      where: { tenantId, deviceId: In(deviceIds), status: In(ACTIVE_ITEM_STATUSES) },
    });
    const activeKey = new Set(activeItems.map((i) => `${i.deviceId}:${i.ledIndex}`));

    for (const binding of bindings) {
      const device = deviceMap.get(binding.deviceId);
      if (!device || device.status !== DeviceStatus.ONLINE) continue;
      if (activeKey.has(`${binding.deviceId}:${binding.ledIndex}`)) continue; // 找货中
      await this.pushBaseColor(device, binding.ledIndex, baseColors.get(binding.locationId) || null);
    }
  }

  private async findLightUpCandidates(tenantId: string, dto: LightUpDto) {
    const query = this.inventoryLocationRepository
      .createQueryBuilder('inventoryLocation')
      .innerJoin(Location, 'location', 'location.id = inventoryLocation.locationId')
      .leftJoin(
        PtlLocationBinding,
        'binding',
        'binding.locationId = location.id AND binding.tenantId = :tenantId AND binding.enabled = 1',
        { tenantId },
      )
      .leftJoin(Device, 'device', 'device.id = binding.deviceId AND device.tenantId = :tenantId', {
        tenantId,
      })
      .select([
        'inventoryLocation.id as inventoryLocationId',
        'inventoryLocation.sku as sku',
        'inventoryLocation.productName as productName',
        'inventoryLocation.locationId as locationId',
        'inventoryLocation.quantity as quantity',
        'inventoryLocation.lockedQuantity as lockedQuantity',
        'inventoryLocation.batchNo as batchNo',
        'inventoryLocation.expiryDate as expiryDate',
        'location.code as locationCode',
        'binding.id as bindingId',
        'binding.deviceId as bindingDeviceId',
        'binding.ledIndex as ledIndex',
        'binding.defaultColor as defaultColor',
        'device.id as deviceId',
        'device.code as deviceCode',
        'device.name as deviceName',
        'device.status as deviceStatus',
      ])
      .where('inventoryLocation.tenantId = :tenantId', { tenantId })
      .andWhere('(inventoryLocation.quantity - inventoryLocation.lockedQuantity) > 0');

    if (dto.sku) {
      query.andWhere('inventoryLocation.sku = :sku', { sku: dto.sku });
    }
    if (dto.locationIds?.length) {
      query.andWhere('inventoryLocation.locationId IN (:...locationIds)', {
        locationIds: dto.locationIds,
      });
    }

    query
      .orderBy('(inventoryLocation.quantity - inventoryLocation.lockedQuantity)', 'DESC')
      .addOrderBy('inventoryLocation.expiryDate', 'ASC');

    const rows = await query.getRawMany();
    return rows.map((row) => ({
      inventoryLocationId: row.inventoryLocationId,
      sku: row.sku,
      productName: row.productName,
      locationId: row.locationId,
      locationCode: row.locationCode,
      quantity: Number(row.quantity || 0),
      lockedQuantity: Number(row.lockedQuantity || 0),
      availableQuantity: Number(row.quantity || 0) - Number(row.lockedQuantity || 0),
      batchNo: row.batchNo,
      expiryDate: row.expiryDate,
      binding: row.bindingId
        ? {
            id: row.bindingId,
            deviceId: row.bindingDeviceId,
            ledIndex: Number(row.ledIndex),
            defaultColor: row.defaultColor,
          }
        : null,
      device: row.deviceId
        ? ({
            id: row.deviceId,
            tenantId,
            code: row.deviceCode,
            name: row.deviceName,
            status: row.deviceStatus,
          } as Device)
        : null,
    }));
  }

  private async getTaskOrFail(tenantId: string, taskId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, tenantId },
      relations: ['items'],
    });
    if (!task) throw new NotFoundException('PTL 找货任务不存在');
    return task;
  }

  private async assertLocationNotActive(tenantId: string, locationId: string) {
    const activeTaskId = await this.getActiveLocationTaskId(tenantId, locationId);
    if (activeTaskId) {
      throw new BadRequestException('库位存在活跃找货任务，需先关闭任务');
    }
  }

  private async getActiveLocationTaskId(tenantId: string, locationId: string) {
    const cached = await this.redisService.Client.get(this.activeLocationKey(tenantId, locationId));
    if (cached) return cached;

    const activeItem = await this.taskItemRepository.findOne({
      where: { tenantId, locationId, status: In(ACTIVE_ITEM_STATUSES) },
      order: { createdAt: 'ASC' },
    });
    return activeItem?.taskId;
  }

  private async setActiveLocation(
    tenantId: string,
    locationId: string,
    taskId: string,
    ttlSeconds: number,
  ) {
    await this.redisService.Client.setex(
      this.activeLocationKey(tenantId, locationId),
      ttlSeconds,
      taskId,
    );
  }

  private async releaseActiveLocation(tenantId: string, locationId: string) {
    await this.redisService.Client.del(this.activeLocationKey(tenantId, locationId));
  }

  private activeLocationKey(tenantId: string, locationId: string) {
    return `ptl:location:active:${tenantId}:${locationId}`;
  }

  private createTaskNo() {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `PTL${ts}${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;
  }

  private createRequestId() {
    return `ptl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
