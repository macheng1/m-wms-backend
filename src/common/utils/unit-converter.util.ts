import { UnitCategory } from '../constants/unit.constant';

/**
 * 单位接口定义
 */
export interface Unit {
  id: string;
  code: string;
  name: string;
  category: UnitCategory;
  baseRatio: number;
  baseUnitCode: string;
  symbol: string;
}

/**
 * 单位换算工具类
 *
 * 核心换算公式:
 * targetQty = (sourceQty × sourceUnit.baseRatio) / targetUnit.baseRatio
 */
export class UnitConverter {
  /**
   * 单位换算
   * @param sourceQty 源数量
   * @param sourceUnit 源单位
   * @param targetUnit 目标单位
   * @returns 换算后的数量
   */
  static convert(
    sourceQty: number,
    sourceUnit: Unit,
    targetUnit: Unit,
  ): number {
    // 验证单位分类是否相同
    if (sourceUnit.category !== targetUnit.category) {
      throw new Error(
        `单位分类不同，无法换算: ${sourceUnit.name}(${sourceUnit.category}) ` +
        `-> ${targetUnit.name}(${targetUnit.category})`,
      );
    }

    // 同一单位直接返回
    if (sourceUnit.code === targetUnit.code) {
      return sourceQty;
    }

    // 执行换算计算
    const targetQty = (sourceQty * sourceUnit.baseRatio) / targetUnit.baseRatio;

    // 根据单位分类处理精度
    return this.roundByCategory(targetQty, sourceUnit.category);
  }

  /**
   * 批量换算：将主单位数量换算为多个辅助单位数量
   * @param baseQty 主单位数量
   * @param baseUnit 主单位
   * @param allUnits 所有单位列表（同分类）
   * @returns 各单位数量映射 { unitCode: quantity }
   */
  static convertToMultipleUnits(
    baseQty: number,
    baseUnit: Unit,
    allUnits: Unit[],
  ): Record<string, number> {
    const result: Record<string, number> = {};

    // 筛选同分类的单位
    const sameCategoryUnits = allUnits.filter(
      u => u.category === baseUnit.category,
    );

    for (const unit of sameCategoryUnits) {
      try {
        result[unit.code] = this.convert(baseQty, baseUnit, unit);
      } catch {
        // 跳过无法换算的单位
      }
    }

    return result;
  }

  /**
   * 根据单位分类进行精度处理
   * @param value 数值
   * @param category 单位分类
   * @returns 处理后的数值
   */
  static roundByCategory(value: number, category: UnitCategory): number {
    switch (category) {
      case UnitCategory.COUNT:
        // 计数单位保留2位小数（避免换算时丢失精度）
        // 例如：111个 = 1.11箱，如果四舍五入会丢失0.11箱的精度
        return Math.round(value * 100) / 100;
      case UnitCategory.WEIGHT:
      case UnitCategory.LENGTH:
      case UnitCategory.VOLUME:
      case UnitCategory.AREA:
        // 物理单位保留2位小数
        return Math.round(value * 100) / 100;
      case UnitCategory.TIME:
        // 时间单位保留2位小数
        return Math.round(value * 100) / 100;
      default:
        return Math.round(value * 100) / 100;
    }
  }

  /**
   * 验证两个单位是否可以换算
   * @param unit1 单位1
   * @param unit2 单位2
   * @returns 是否可以换算
   */
  static canConvert(unit1: Unit, unit2: Unit): boolean {
    return unit1.category === unit2.category;
  }

  /**
   * 获取基准单位（同分类下baseRatio最小的单位）
   * @param units 单位列表
   * @param category 单位分类
   * @returns 基准单位
   */
  static getBaseUnit(units: Unit[], category: UnitCategory): Unit | undefined {
    const sameCategoryUnits = units.filter(u => u.category === category);
    if (sameCategoryUnits.length === 0) {
      return undefined;
    }

    // 返回 baseRatio 最小的单位
    return sameCategoryUnits.reduce((min, current) =>
      current.baseRatio < min.baseRatio ? current : min,
    );
  }

  /**
   * 格式化数量显示
   * @param qty 数量
   * @param unit 单位
   * @returns 格式化后的字符串，如 "1,200 kg"
   */
  static formatQuantity(qty: number, unit: Unit): string {
    const formattedQty = qty.toLocaleString('zh-CN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });
    return `${formattedQty} ${unit.symbol}`;
  }

  /**
   * 计算库存变动后的数量
   * @param currentQty 当前数量（主单位）
   * @param changeQty 变动数量
   * @param currentUnit 当前单位
   * @param changeUnit 变动单位
   * @returns 变动后的数量（主单位）
   */
  static calculateAfterQty(
    currentQty: number,
    changeQty: number,
    currentUnit: Unit,
    changeUnit: Unit,
  ): number {
    // 将变动数量换算为主单位
    const convertedChangeQty = this.convert(
      Math.abs(changeQty),
      changeUnit,
      currentUnit,
    );

    // 根据变动方向计算
    if (changeQty > 0) {
      // 入库：增加
      return currentQty + convertedChangeQty;
    } else {
      // 出库：减少
      return currentQty - convertedChangeQty;
    }
  }
}
