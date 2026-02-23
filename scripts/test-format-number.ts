/**
 * 测试 formatNumber 函数的各种情况
 */

// 复制 formatNumber 函数
const formatNumber = (num: number | string): string => {
  const numberValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numberValue)) return '0';

  const rounded = Math.round(numberValue * 100) / 100;

  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }

  let formatted = rounded.toFixed(2);
  if (formatted.endsWith('.00')) {
    formatted = formatted.slice(0, -3);
  } else if (formatted.endsWith('0')) {
    formatted = formatted.slice(0, -1);
  }

  return formatted;
};

// 测试用例
const testCases = [
  { input: 1, expected: '1', description: '整数' },
  { input: 1.0, expected: '1', description: '整数（带.0）' },
  { input: 1.00, expected: '1', description: '整数（带.00）' },
  { input: 100, expected: '100', description: '大整数' },
  { input: 100.00, expected: '100', description: '大整数（带.00）' },
  { input: 1.5, expected: '1.5', description: '一位小数' },
  { input: 1.50, expected: '1.5', description: '一位小数（带0）' },
  { input: 1.25, expected: '1.25', description: '两位小数' },
  { input: 1.256, expected: '1.26', description: '三位小数（四舍五入）' },
  { input: 0, expected: '0', description: '零' },
  { input: 0.00, expected: '0', description: '零（带.00）' },
  { input: 0.5, expected: '0.5', description: '小于1的小数' },
  { input: '1', expected: '1', description: '字符串整数' },
  { input: '1.00', expected: '1', description: '字符串整数（带.00）' },
  { input: '1.5', expected: '1.5', description: '字符串小数' },
  { input: 1200, expected: '1200', description: '大整数' },
  { input: 1200.00, expected: '1200', description: '大整数（带.00）' },
  { input: 1.2, expected: '1.2', description: '小数（一位）' },
  { input: 1.23, expected: '1.23', description: '小数（两位）' },
];

console.log('formatNumber 函数测试结果：\n');
console.log('┌─────────────┬───────────┬──────────┬────────────┐');
console.log('│ 输入值      │ 期望值    │ 实际值   │ 测试结果   │');
console.log('├─────────────┼───────────┼──────────┼────────────┤');

let passCount = 0;
let failCount = 0;

for (const testCase of testCases) {
  const result = formatNumber(testCase.input);
  const pass = result === testCase.expected;
  const status = pass ? '✅ PASS' : '❌ FAIL';

  if (pass) {
    passCount++;
  } else {
    failCount++;
  }

  const inputStr = String(testCase.input).padEnd(11);
  const expectedStr = testCase.expected.padEnd(9);
  const resultStr = result.padEnd(8);

  console.log(`│ ${inputStr} │ ${expectedStr} │ ${resultStr} │ ${status} │`);
}

console.log('└─────────────┴───────────┴──────────┴────────────┘');
console.log(`\n总计: ${testCases.length} 个测试`);
console.log(`通过: ${passCount} 个`);
console.log(`失败: ${failCount} 个`);

if (failCount === 0) {
  console.log('\n✅ 所有测试通过！');
} else {
  console.log('\n❌ 有测试失败，需要检查！');
  process.exit(1);
}

export {};
