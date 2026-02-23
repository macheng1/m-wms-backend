/**
 * 通知模块导出文件
 *
 * 方便其他模块导入使用
 */

// 导出实体
export * from './entities/notification.entity';

// 导出枚举和接口
export * from './interfaces/notification-type.enum';
export * from './interfaces/notification.interface';

// 导出 DTO
export * from './dto/send-notification.dto';
export * from './dto/query-notification.dto';
export * from './dto/notification-response.dto';

// 导出服务
export * from './services/notifications.service';
export * from './services/sse-connection.manager';

// 导出模块
export * from './notifications.module';
