import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, MqttClient } from 'mqtt';
import { Device } from '@/modules/location/entities/device.entity';

export interface PtlCommand {
  requestId: string;
  action: 'on' | 'off' | 'calibrate';
  taskId?: string;
  index: number;
  color?: string;
  mode?: string;
  timeout?: number;
}

export interface PtlCommandResult {
  success: boolean;
  ackAt?: Date;
  errorMessage?: string;
  simulated?: boolean;
}

/** 设备上报事件（心跳 / 按钮 / ACK 等） */
export interface PtlDeviceEvent {
  tenantId: string;
  deviceCode: string;
  type: string; // heartbeat | online | ack | button | ...
  raw: Record<string, any>;
}

export type PtlEventHandler = (event: PtlDeviceEvent) => Promise<void> | void;

@Injectable()
export class PtlCommandGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PtlCommandGateway.name);
  private client: MqttClient | null = null;
  private eventHandler: PtlEventHandler | null = null;
  // 订阅所有租户、所有控制器的事件上报：mwms/ptl/{tenantId}/{deviceCode}/event
  private readonly eventTopic = 'mwms/ptl/+/+/event';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const brokerUrl = this.brokerUrl();
    if (!brokerUrl) {
      this.logger.warn(
        'PTL MQTT 未配置 (PTL_MQTT_URL)，运行在模拟模式：不连接 broker、不接收设备事件',
      );
      return;
    }
    this.ensureClient(brokerUrl);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.endAsync(true);
      this.client = null;
    }
  }

  /** 业务层注册设备事件处理器（避免网关反向依赖 service） */
  setEventHandler(handler: PtlEventHandler) {
    this.eventHandler = handler;
  }

  async send(device: Device, command: PtlCommand): Promise<PtlCommandResult> {
    const brokerUrl = this.brokerUrl();
    if (!brokerUrl) {
      this.logger.warn(
        `PTL MQTT 未配置，模拟下发 ${command.action} -> ${device.code}#${command.index}`,
      );
      return { success: true, ackAt: new Date(), simulated: true };
    }

    try {
      const client = this.ensureClient(brokerUrl);
      const topicPrefix = device.config?.mqttTopicPrefix || 'mwms/ptl';
      const topic = `${topicPrefix}/${device.tenantId}/${device.code}/cmd`;
      await client.publishAsync(topic, JSON.stringify(command), { qos: 1 });
      return { success: true, ackAt: new Date() };
    } catch (error: any) {
      this.logger.error(`PTL MQTT publish failed: ${error?.message || error}`);
      return { success: false, errorMessage: error?.message || 'PTL MQTT 发布失败' };
    }
  }

  private brokerUrl(): string | undefined {
    return this.configService.get<string>('ptl.mqttUrl') || process.env.PTL_MQTT_URL;
  }

  private ensureClient(brokerUrl: string): MqttClient {
    if (this.client) return this.client;

    const client = connect(brokerUrl, {
      username:
        this.configService.get<string>('ptl.mqttUsername') || process.env.PTL_MQTT_USERNAME,
      password:
        this.configService.get<string>('ptl.mqttPassword') || process.env.PTL_MQTT_PASSWORD,
      clientId:
        this.configService.get<string>('ptl.mqttClientId') ||
        process.env.PTL_MQTT_CLIENT_ID ||
        `m-wms-ptl-${process.pid}`,
      reconnectPeriod: 2000,
      connectTimeout: 5000,
      clean: true,
    });
    this.client = client;

    // 初次连接 + 每次重连都重新订阅，避免重连后收不到事件
    client.on('connect', () => {
      this.logger.log('PTL MQTT 已连接');
      client.subscribe(this.eventTopic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`PTL MQTT 订阅失败: ${err.message}`);
        } else {
          this.logger.log(`PTL MQTT 已订阅设备事件: ${this.eventTopic}`);
        }
      });
    });
    client.on('reconnect', () => this.logger.warn('PTL MQTT 重连中...'));
    client.on('error', (error) => this.logger.error(`PTL MQTT client error: ${error.message}`));
    client.on('message', (topic, payload) => this.onMessage(topic, payload));

    return client;
  }

  private onMessage(topic: string, payload: Buffer) {
    // 取末尾三段：{tenantId}/{deviceCode}/event（兼容自定义前缀长度）
    const parts = topic.split('/');
    if (parts.length < 3 || parts[parts.length - 1] !== 'event') return;
    const deviceCode = parts[parts.length - 2];
    const tenantId = parts[parts.length - 3];

    let raw: Record<string, any> = {};
    try {
      raw = JSON.parse(payload.toString() || '{}');
    } catch {
      raw = { raw: payload.toString() };
    }
    const type = String(raw.type || 'heartbeat');

    if (!this.eventHandler) {
      this.logger.debug(`收到设备事件但处理器未就绪: ${topic}`);
      return;
    }

    Promise.resolve(this.eventHandler({ tenantId, deviceCode, type, raw })).catch((e) =>
      this.logger.error(`处理设备事件失败: ${e?.message || e}`),
    );
  }
}
