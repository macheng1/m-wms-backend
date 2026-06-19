import { registerAs } from '@nestjs/config';

export default registerAs('ptl', () => ({
  // MQTT broker 地址，如 mqtt://broker.emqx.io:1883；不配置时网关运行在模拟模式
  mqttUrl: process.env.PTL_MQTT_URL,
  mqttUsername: process.env.PTL_MQTT_USERNAME,
  mqttPassword: process.env.PTL_MQTT_PASSWORD,
  mqttClientId: process.env.PTL_MQTT_CLIENT_ID,
  // 心跳超时秒数：超过该时长无心跳则判定控制器离线
  heartbeatTimeoutSeconds: parseInt(process.env.PTL_HEARTBEAT_TIMEOUT || '60', 10),
}));
