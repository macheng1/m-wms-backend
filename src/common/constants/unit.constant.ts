/**
 * 单位分类枚举
 */
export enum UnitCategory {
  COUNT = 'COUNT', // 计数单位：个、根、支、箱、件
  WEIGHT = 'WEIGHT', // 重量单位：kg、g、吨、斤、两
  LENGTH = 'LENGTH', // 长度单位：m、cm、mm、英寸
  VOLUME = 'VOLUME', // 体积单位：L、mL、m³
  AREA = 'AREA', // 面积单位：m²、cm²、亩
  TIME = 'TIME', // 时间单位：小时、天、月
}

/**
 * 单位分类显示名称映射
 */
export const UnitCategoryNames: Record<UnitCategory, string> = {
  [UnitCategory.COUNT]: '计数单位',
  [UnitCategory.WEIGHT]: '重量单位',
  [UnitCategory.LENGTH]: '长度单位',
  [UnitCategory.VOLUME]: '体积单位',
  [UnitCategory.AREA]: '面积单位',
  [UnitCategory.TIME]: '时间单位',
};

/**
 * 库存交易类型枚举
 */
export enum TransactionType {
  // 入库类型
  INBOUND_PURCHASE = 'INBOUND_PURCHASE', // 采购入库
  INBOUND_RETURN = 'INBOUND_RETURN', // 退货入库
  INBOUND_TRANSFER = 'INBOUND_TRANSFER', // 调拨入库
  INBOUND_PRODUCTION = 'INBOUND_PRODUCTION', // 生产入库

  // 出库类型
  OUTBOUND_SALES = 'OUTBOUND_SALES', // 销售出库
  OUTBOUND_MATERIAL = 'OUTBOUND_MATERIAL', // 领料出库
  OUTBOUND_TRANSFER = 'OUTBOUND_TRANSFER', // 调拨出库
  OUTBOUND_SCRAP = 'OUTBOUND_SCRAP', // 报废出库

  // 调整类型
  ADJUSTMENT_IN = 'ADJUSTMENT_IN', // 盘盈
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT', // 盘亏
}

/**
 * 交易类型显示名称映射
 */
export const TransactionTypeNames: Record<TransactionType, string> = {
  [TransactionType.INBOUND_PURCHASE]: '采购入库',
  [TransactionType.INBOUND_RETURN]: '退货入库',
  [TransactionType.INBOUND_TRANSFER]: '调拨入库',
  [TransactionType.INBOUND_PRODUCTION]: '生产入库',
  [TransactionType.OUTBOUND_SALES]: '销售出库',
  [TransactionType.OUTBOUND_MATERIAL]: '领料出库',
  [TransactionType.OUTBOUND_TRANSFER]: '调拨出库',
  [TransactionType.OUTBOUND_SCRAP]: '报废出库',
  [TransactionType.ADJUSTMENT_IN]: '盘盈',
  [TransactionType.ADJUSTMENT_OUT]: '盘亏',
};

/**
 * 判断是否为入库类型
 */
export function isInboundType(type: TransactionType): boolean {
  return type.startsWith('INBOUND_') || type === TransactionType.ADJUSTMENT_IN;
}

/**
 * 判断是否为出库类型
 */
export function isOutboundType(type: TransactionType): boolean {
  return type.startsWith('OUTBOUND_') || type === TransactionType.ADJUSTMENT_OUT;
}
