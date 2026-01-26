/**
 * 预警级别枚举
 */
export enum AlertLevel {
  CRITICAL = 'CRITICAL', // 严重 - 红色（零库存或库存<=0）
  HIGH = 'HIGH',         // 高 - 橙色（库存 < 安全库存*20%）
  MEDIUM = 'MEDIUM',     // 中 - 黄色（库存 < 安全库存*50%）
}

/**
 * 预警级别信息映射
 */
export const AlertLevelInfo = {
  [AlertLevel.CRITICAL]: {
    label: '严重',
    message: '库存为零，请立即补货',
    color: 'error',
    level: 3,
  },
  [AlertLevel.HIGH]: {
    label: '高',
    message: '库存严重不足，低于安全库存的20%',
    color: 'warning',
    level: 2,
  },
  [AlertLevel.MEDIUM]: {
    label: '中',
    message: '库存偏低，低于安全库存的50%',
    color: 'info',
    level: 1,
  },
};
