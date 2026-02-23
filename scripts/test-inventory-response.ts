/**
 * 库存列表接口返回数据格式优化示例
 *
 * 优化前 vs 优化后对比
 */

// ============ 优化前的返回格式 ============
{
  "list": [
    {
      "id": "xxx",
      "sku": "SKU-001",
      "productName": "大米",
      "quantity": 1200,              // ❌ 只有数字，不知道单位
      "unitId": "unit-xxx",
      "multiUnitQty": {              // ❌ 只有数量，没有单位名称
        "kg": 1200,
        "g": 1200000,
        "ton": 1.2
      },
      "location": "A01",
      "createdAt": "2024-01-01",
      "updatedAt": "2024-01-01"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}

// ============ 优化后的返回格式 ============
{
  "list": [
    {
      "id": "xxx",
      "sku": "SKU-001",
      "productName": "大米",
      "quantity": 1200,
      "quantityDisplay": "1200 kg",  // ✅ 新增：带单位的显示
      "unitId": "unit-xxx",
      "unitName": "千克",            // ✅ 新增：单位名称
      "unitCode": "KG",              // ✅ 新增：单位编码
      "unitSymbol": "kg",            // ✅ 新增：单位符号
      "multiUnitQty": {              // ✅ 优化：每个单位包含完整信息
        "kg": {
          "quantity": 1200,
          "name": "千克",
          "symbol": "kg",
          "display": "1200 kg"       // ✅ 可直接用于前端显示
        },
        "g": {
          "quantity": 1200000,
          "name": "克",
          "symbol": "g",
          "display": "1200000 g"
        },
        "ton": {
          "quantity": 1.2,
          "name": "吨",
          "symbol": "ton",
          "display": "1.2 ton"
        }
      },
      "location": "A01",
      "createdAt": "2024-01-01",
      "updatedAt": "2024-01-01"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}

// ============ 前端使用示例 ============
/**
 * 1. 显示主库存（带单位）
 */
<div>{item.quantityDisplay}</div>
// 输出: 1200 kg

/**
 * 2. 遍历显示多单位库存
 */
{Object.entries(item.multiUnitQty).map(([code, info]) => (
  <div key={code}>
    {info.name}: {info.display}
  </div>
))}
// 输出:
// 千克: 1200 kg
// 克: 1200000 g
// 吨: 1.2 ton

/**
 * 3. 单位下拉选择
 */
<select>
  {Object.entries(item.multiUnitQty).map(([code, info]) => (
    <option key={code} value={code}>
      {info.name} ({info.symbol})
    </option>
  ))}
</select>
// 输出选项:
// - 千克
// - 克
// - 吨

export {};
