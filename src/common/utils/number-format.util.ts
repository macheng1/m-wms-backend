/**
 * 数量 / 数字格式化工具
 *
 * 集中存放库存等模块中反复使用的「数字 -> 展示字符串 / 规范化数字」逻辑，
 * 避免在 service 各处重复书写相同的四舍五入与去尾零代码。
 * 这里只放纯函数，不依赖任何业务实体，可被任意模块复用。
 */

/**
 * 格式化数字：整数不显示小数位，小数保留必要的位数。
 *
 * - 会先按两位小数四舍五入，规避浮点精度问题（如 1.00 被识别为整数）。
 * - 整数直接返回整数形式；小数保留 2 位并去掉尾部多余的 0。
 *
 * 例：1 -> "1"，1.00 -> "1"，1.50 -> "1.5"，1.234 -> "1.23"。
 *
 * @param num 数字或可转为数字的字符串
 * @returns 格式化后的字符串（无法解析时返回 "0"）
 */
export const formatNumber = (num: number | string): string => {
  const numberValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numberValue)) return '0';

  // 处理小数精度问题，确保 1.00 这种情况被识别为整数
  const rounded = Math.round(numberValue * 100) / 100;

  // 如果是整数（或四舍五入后是整数），直接返回整数形式
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }

  // 如果不是整数，保留2位小数并移除尾部的0
  let formatted = rounded.toFixed(2);
  if (formatted.endsWith('.00')) {
    formatted = formatted.slice(0, -3);
  } else if (formatted.endsWith('0')) {
    formatted = formatted.slice(0, -1);
  }

  return formatted;
};

/**
 * 规范化数量：把数据库 decimal 字段转换成「整数返回整数、小数返回小数」的数字。
 *
 * 等价于原先散落各处的三元表达式：
 *   Math.round(x * 100) / 100 === Math.floor(x) ? Math.floor(x) : Math.round(x * 100) / 100
 *
 * 即：先四舍五入到两位小数；若结果恰好是整数，则返回整数，否则返回两位小数的数字。
 *
 * @param value 数字或可转为数字的字符串
 * @returns 规范化后的数字
 */
export const normalizeQuantity = (value: number | string): number => {
  const num = Number(value);
  const rounded = Math.round(num * 100) / 100;
  return rounded === Math.floor(num) ? Math.floor(num) : rounded;
};
