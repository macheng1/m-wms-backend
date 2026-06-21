export interface InventoryUnitResult {
  id: string;
  code: string;
  name: string;
  category: string;
  symbol: string;
}

export interface InventoryResult {
  sku: string;
  productName: string;
  beforeQty: number;
  afterQty: number;
  unit: InventoryUnitResult;
  transactionId: string;
  // 格式化显示字段
  quantityDisplay?: string;   // 变动数量显示（带正负号）
  beforeQtyDisplay?: string;  // 变动前数量显示
  afterQtyDisplay?: string;   // 变动后数量显示
}
