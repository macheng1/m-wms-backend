import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InboundDto, BatchInboundDto } from './dto/inbound.dto';
import { OutboundDto, BatchOutboundDto } from './dto/outbound.dto';
import { InventoryResult } from './dto/inventory-result.dto';
import { UnitService } from '../unit/unit.service';
import { UnitConverter, Unit } from '../../common/utils/unit-converter.util';
import { isInboundType, isOutboundType, TransactionType, TransactionTypeNames } from '../../common/constants/unit.constant';
import { Product } from '../product/product.entity';
import { AlertLevel, AlertLevelInfo } from '../../common/constants/alert-level.constant';
import { NotificationsService } from '../notifications/services/notifications.service';
import { NotificationType, NotificationCategory, NotificationPriority } from '../notifications/interfaces/notification-type.enum';

/**
 * 格式化数字：整数不显示小数位，小数保留必要的位数
 * @param num 数字
 * @returns 格式化后的字符串
 */
const formatNumber = (num: number | string): string => {
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

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepository: Repository<InventoryTransaction>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private unitService: UnitService,
    private dataSource: DataSource,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * 根据 SKU（产品code）获取产品信息
   */
  private async getProductBySku(sku: string, tenantId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { code: sku, tenantId },
    });
    if (!product) {
      throw new NotFoundException(`SKU ${sku} 对应的产品不存在`);
    }
    return product;
  }

  async create(
    createInventoryDto: CreateInventoryDto,
    tenantId: string,
  ): Promise<Inventory> {
    const inventory = this.inventoryRepository.create({
      ...createInventoryDto,
      tenantId,
    });
    return this.inventoryRepository.save(inventory);
  }

  async findAll(tenantId: string): Promise<Inventory[]> {
    return this.inventoryRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 分页获取库存列表
   */
  async findPage(
    tenantId: string,
    options: {
      page?: number;
      pageSize?: number;
      sku?: string;
      keyword?: string;
      stockStatus?: string; // 库存状态筛选：OUT_OF_STOCK/LOW_STOCK/IN_STOCK
    } = {},
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, sku, keyword, stockStatus } = options;

    const queryBuilder = this.inventoryRepository.createQueryBuilder('inventory');
    queryBuilder
      .leftJoin('inventory.unit', 'unit')
      .leftJoin('locations', 'location', 'inventory.locationId = location.id AND location.tenantId = :tenantId')
      .leftJoin('products', 'product', 'inventory.sku = product.code AND product.tenantId = :tenantId')
      .select([
        'inventory',
        'unit.name as unitName',
        'unit.code as unitCode',
        'unit.symbol as unitSymbol',
        'location.name as locationName',
        'location.code as locationCode',
        'product.safetyStock as safetyStock',
      ])
      .where('inventory.tenantId = :tenantId', { tenantId });

    if (sku) {
      queryBuilder.andWhere('inventory.sku LIKE :sku', { sku: `%${sku}%` });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(inventory.sku LIKE :keyword OR inventory.productName LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 在数据库层面进行库存状态筛选
    if (stockStatus === 'OUT_OF_STOCK') {
      queryBuilder.andWhere('inventory.quantity = 0');
    } else if (stockStatus === 'LOW_STOCK') {
      queryBuilder.andWhere('inventory.quantity > 0 AND inventory.quantity < COALESCE(product.safetyStock, 0)');
    } else if (stockStatus === 'IN_STOCK') {
      queryBuilder.andWhere('inventory.quantity >= COALESCE(product.safetyStock, 0)');
      queryBuilder.andWhere('product.safetyStock IS NOT NULL');
    }

    queryBuilder.orderBy('inventory.createdAt', 'DESC');

    const result = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();

    // 获取总数
    const total = await queryBuilder.getCount();

    // 获取所有单位，用于多单位库存显示
    const allUnits = await this.unitService.getAllUnits(tenantId);
    const unitMap = new Map(allUnits.map(u => [u.code, u]));

    // 计算库存状态
    const calculateStockStatus = (quantity: number, safetyStock: number | null): string => {
      const safetyStockNum = safetyStock ? Number(safetyStock) : 0;
      if (quantity === 0) {
        return 'OUT_OF_STOCK';  // 零库存
      } else if (quantity < safetyStockNum) {
        return 'LOW_STOCK';     // 库存不足
      } else {
        return 'IN_STOCK';      // 库存充足
      }
    };

    // 库存状态映射（用于前端显示）
    const stockStatusMap = {
      OUT_OF_STOCK: { label: '零库存', color: 'error', level: 3 },
      LOW_STOCK: { label: '库存不足', color: 'warning', level: 2 },
      IN_STOCK: { label: '库存充足', color: 'success', level: 1 },
    };

    // 格式化返回数据
    let list = result.entities.map((entity: any, index) => {
      const raw = result.raw[index];
      const numQuantity = Number(entity.quantity);
      const safetyStock = raw.safetyStock ? Number(raw.safetyStock) : 0;
      const status = calculateStockStatus(numQuantity, safetyStock);

      // 实时计算多单位库存（确保数据正确，不依赖数据库中可能过期的 multiUnitQty）
      const formattedMultiUnitQty: Record<string, any> = {};
      if (entity.unitId) {
        const inventoryUnit = allUnits.find(u => u.id === entity.unitId);
        if (inventoryUnit) {
          const inventoryUnitObj = this.toUnit(inventoryUnit);
          const allUnitObjs = allUnits.map(u => this.toUnit(u));
          const multiUnitQty = UnitConverter.convertToMultipleUnits(
            numQuantity,
            inventoryUnitObj,
            allUnitObjs,
          );

          for (const [unitCode, qty] of Object.entries(multiUnitQty)) {
            const unit = unitMap.get(unitCode);
            if (unit) {
              const numQty = Number(qty);
              formattedMultiUnitQty[unitCode] = {
                quantity: numQty,
                name: unit.name,
                symbol: unit.symbol,
                display: `${formatNumber(numQty)} ${unit.symbol}`
              };
            }
          }
        }
      }

      return {
        ...entity,
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        quantity: Math.round(numQuantity * 100) / 100 === Math.floor(numQuantity) ? Math.floor(numQuantity) : Math.round(numQuantity * 100) / 100,
        unitName: raw.unitName,
        unitCode: raw.unitCode,
        unitSymbol: raw.unitSymbol,
        // 库位信息
        locationName: raw.locationName,
        locationCode: raw.locationCode,
        // quantity 带单位显示（整数不显示小数位）
        quantityDisplay: raw.unitSymbol
          ? `${formatNumber(numQuantity)} ${raw.unitSymbol}`
          : `${formatNumber(numQuantity)}`,
        // 多单位库存带单位信息（实时计算，整数不显示小数位）
        multiUnitQty: formattedMultiUnitQty,
        // 安全库存
        safetyStock: Math.round(safetyStock * 100) / 100 === Math.floor(safetyStock) ? Math.floor(safetyStock) : Math.round(safetyStock * 100) / 100,
        safetyStockDisplay: safetyStock > 0 ? `${formatNumber(safetyStock)} ${raw.unitSymbol || ''}` : '未设置',
        // 库存状态
        stockStatus: status,
        stockStatusInfo: stockStatusMap[status],
      };
    });

    return { list, total, page, pageSize };
  }

  async findOne(id: string, tenantId: string): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id, tenantId },
    });
    if (!inventory) {
      throw new NotFoundException('库存记录不存在');
    }
    return inventory;
  }

  async findBySku(sku: string, tenantId: string): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { sku, tenantId },
    });
    if (!inventory) {
      throw new NotFoundException(`SKU ${sku} 的库存记录不存在`);
    }
    return inventory;
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
    tenantId: string,
  ): Promise<Inventory> {
    await this.inventoryRepository.update({ id, tenantId }, updateInventoryDto);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.inventoryRepository.delete({ id, tenantId });
  }

  /**
   * 获取可出库库存列表（下拉选择用）
   */
  async getAvailableForOutbound(
    tenantId: string,
    options: {
      keyword?: string;
    } = {},
  ): Promise<
    Array<{
      value: string;    // SKU，用于下拉选择的值
      label: string;    // 显示文本：产品名称 (SKU)
      sku: string;
      productName: string;
      quantity: number;
      unitName: string;
      unitSymbol: string;
    }>
  > {
    const { keyword } = options;

    const queryBuilder = this.inventoryRepository.createQueryBuilder('inventory');
    queryBuilder
      .leftJoin('inventory.unit', 'unit')
      .select([
        'inventory.sku',
        'inventory.productName',
        'inventory.quantity',
        'unit.name',
        'unit.symbol',
        'inventory.updatedAt',
      ])
      .where('inventory.tenantId = :tenantId', { tenantId })
      .andWhere('inventory.quantity > 0');

    if (keyword) {
      queryBuilder.andWhere(
        '(inventory.sku LIKE :keyword OR inventory.productName LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    queryBuilder
      .orderBy('inventory.sku', 'ASC')
      .addOrderBy('inventory.updatedAt', 'DESC')
      .take(100); // 限制最多返回100条

    const result = await queryBuilder.getRawMany();

    // 对相同 SKU 的记录去重，只保留最新的（按 updatedAt 降序排列后第一个）
    const uniqueMap = new Map<string, any>();
    for (const item of result) {
      const sku = item.inventory_sku;
      if (!uniqueMap.has(sku)) {
        uniqueMap.set(sku, item);
      }
    }

    return Array.from(uniqueMap.values()).map((item) => ({
      value: item.inventory_sku,
      label: `${item.inventory_productName} (${item.inventory_sku}) - 库存: ${item.inventory_quantity}${item.unit_symbol || ''}`,
      sku: item.inventory_sku,
      productName: item.inventory_productName,
      quantity: Number(item.inventory_quantity),
      unitName: item.unit_name,
      unitSymbol: item.unit_symbol,
    }));
  }

  /**
   * 入库操作
   */
  async inbound(
    dto: InboundDto,
    tenantId: string,
  ): Promise<InventoryResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 验证产品并获取产品信息（SKU 即为产品 code）
      const product = await this.getProductBySku(dto.sku, tenantId);

      // 2. 获取单位信息
      const unit = await this.unitService.findByCode(dto.unitCode, tenantId);
      if (!unit) {
        // 检测是否传错了参数（SKU 被当作 unitCode）
        if (dto.unitCode?.toUpperCase().startsWith('SKU-')) {
          throw new BadRequestException(`参数错误：${dto.unitCode} 是产品编码(SKU)，不是单位编码。请检查请求参数中 sku 和 unitCode 是否正确填写。`);
        }
        throw new BadRequestException(`单位编码 ${dto.unitCode} 不存在`);
      }
      if (unit.isActive !== 1) {
        throw new BadRequestException('单位未启用');
      }

      // 3. 查找或创建库存记录
      let inventory = await queryRunner.manager.findOne(Inventory, {
        where: { sku: dto.sku, tenantId },
      });

      const beforeQty = inventory ? Number(inventory.quantity) : 0;
      let convertedQty: number;

      let inventoryUnit: any; // 库存主单位
      if (inventory && inventory.unitId) {
        // 库存记录存在且有单位，需要换算
        inventoryUnit = await this.unitService.findOne(
          inventory.unitId,
          tenantId,
        );
        convertedQty = UnitConverter.convert(
          dto.quantity,
          unit,
          this.toUnit(inventoryUnit),
        );

        // 4. 更新库存（同时更新产品名称，以防产品名称变更）
        await queryRunner.manager.update(
          Inventory,
          { id: inventory.id },
          {
            quantity: beforeQty + convertedQty,
            productName: product.name,
          },
        );

        inventory = await queryRunner.manager.findOne(Inventory, {
          where: { id: inventory.id },
        });
      } else {
        // 库存记录不存在或无单位，直接创建
        convertedQty = dto.quantity;
        inventoryUnit = unit; // 新建时，用户选择的单位就是库存主单位
        inventory = queryRunner.manager.create(Inventory, {
          sku: dto.sku,
          productName: product.name, // 使用产品表中的名称
          quantity: convertedQty,
          unitId: unit.id,
          locationId: dto.locationId,
          tenantId,
          multiUnitQty: null,
        });
        inventory = await queryRunner.manager.save(inventory);
      }

      // 4. 更新多单位库存（使用库存主单位）
      await this.updateMultiUnitQty(
        queryRunner,
        inventory!,
        inventoryUnit,
        tenantId,
      );

      const afterQty = Number(inventory!.quantity);

      // 5. 创建交易记录
      const transaction = queryRunner.manager.create(InventoryTransaction, {
        sku: dto.sku,
        productName: product.name,
        transactionType: dto.type,
        quantity: dto.quantity,
        unitId: unit.id,
        beforeQty,
        afterQty,
        orderNo: dto.orderNo,
        locationId: dto.locationId,
        remark: dto.remark,
        tenantId,
      });
      const savedTransaction =
        await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      const unitObj = this.toUnit(unit);

      // 发送库存变更通知（异步，不阻塞返回）
      if (dto.notifyUserIds && dto.notifyUserIds.length > 0) {
        setImmediate(async () => {
          try {
            await this.sendStockChangeNotification(
              tenantId,
              dto.sku,
              product.name,
              dto.type,
              dto.quantity,
              beforeQty,
              afterQty,
              unitObj.symbol,
              dto.notifyUserIds!,
            );
          } catch (error) {
            console.error('发送库存变更通知失败:', error);
          }
        });
      }

      // beforeQty 和 afterQty 是库存主单位的数量，需要换算成用户选择的单位
      let displayBeforeQty = beforeQty;
      let displayAfterQty = afterQty;

      // 如果库存记录存在且有单位，且与用户选择的单位不同，需要换算
      if (inventory && inventory.unitId && inventory.unitId !== unit.id) {
        const inventoryUnit = await this.unitService.findOne(inventory.unitId, tenantId);
        if (inventoryUnit) {
          displayBeforeQty = UnitConverter.convert(beforeQty, this.toUnit(inventoryUnit), unitObj);
          displayAfterQty = UnitConverter.convert(afterQty, this.toUnit(inventoryUnit), unitObj);
        }
      }

      // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
      const normalizedBeforeQty = Math.round(displayBeforeQty * 100) / 100 === Math.floor(displayBeforeQty) ? Math.floor(displayBeforeQty) : Math.round(displayBeforeQty * 100) / 100;
      const normalizedAfterQty = Math.round(displayAfterQty * 100) / 100 === Math.floor(displayAfterQty) ? Math.floor(displayAfterQty) : Math.round(displayAfterQty * 100) / 100;

      return {
        sku: dto.sku,
        productName: inventory!.productName,
        beforeQty: normalizedBeforeQty,
        afterQty: normalizedAfterQty,
        unit: unitObj,
        transactionId: savedTransaction.id,
        // 添加格式化显示字段
        quantityDisplay: `+${formatNumber(dto.quantity)} ${unitObj.symbol}`,
        beforeQtyDisplay: `${formatNumber(normalizedBeforeQty)} ${unitObj.symbol}`,
        afterQtyDisplay: `${formatNumber(normalizedAfterQty)} ${unitObj.symbol}`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 批量入库
   */
  async batchInbound(
    dto: BatchInboundDto,
    tenantId: string,
  ): Promise<InventoryResult[]> {
    const results: InventoryResult[] = [];

    for (const item of dto.items) {
      const result = await this.inbound(
        {
          ...item,
          orderNo: dto.orderNo,
          locationId: dto.locationId,
          type: dto.type,
          remark: dto.remark,
        },
        tenantId,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 出库操作
   */
  async outbound(
    dto: OutboundDto,
    tenantId: string,
  ): Promise<InventoryResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 验证产品并获取产品信息（SKU 即为产品 code）
      const product = await this.getProductBySku(dto.sku, tenantId);

      // 2. 查找库存记录（加锁）
      const inventory = await queryRunner.manager.findOne(Inventory, {
        where: { sku: dto.sku, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!inventory) {
        throw new NotFoundException(`SKU ${dto.sku} 的库存记录不存在`);
      }

      const beforeQty = Number(inventory.quantity);

      // 3. 获取库存单位
      const inventoryUnit = await this.unitService.findOne(
        inventory.unitId!,
        tenantId,
      );

      // 4. 确定出库单位（优先使用传入的 unitCode，否则使用库存单位）
      let unit: any;
      if (dto.unitCode) {
        unit = await this.unitService.findByCode(dto.unitCode, tenantId);
        if (!unit) {
          // 检测是否传错了参数（SKU 被当作 unitCode）
          if (dto.unitCode?.toUpperCase().startsWith('SKU-')) {
            throw new BadRequestException(`参数错误：${dto.unitCode} 是产品编码(SKU)，不是单位编码。请检查请求参数中 sku 和 unitCode 是否正确填写。`);
          }
          throw new BadRequestException(`单位编码 ${dto.unitCode} 不存在`);
        }
        if (unit.isActive !== 1) {
          throw new BadRequestException('单位未启用');
        }
      } else {
        // 未提供 unitCode 时，使用库存单位
        unit = inventoryUnit;
      }

      // 5. 换算出库数量
      const outboundQty = UnitConverter.convert(
        dto.quantity,
        unit,
        this.toUnit(inventoryUnit),
      );

      // 6. 检查库存是否充足
      if (beforeQty < outboundQty) {
        throw new BadRequestException(
          `库存不足: 当前${beforeQty}${inventoryUnit.symbol}, 需要出库${outboundQty}${inventoryUnit.symbol}`,
        );
      }

      // 7. 更新库存
      const afterQty = beforeQty - outboundQty;
      await queryRunner.manager.update(
        Inventory,
        { id: inventory.id },
        {
          quantity: afterQty,
        },
      );

      // 7. 更新多单位库存
      const updatedInventory = await queryRunner.manager.findOne(Inventory, {
        where: { id: inventory.id },
      });
      await this.updateMultiUnitQty(
        queryRunner,
        updatedInventory!,
        inventoryUnit,
        tenantId,
      );

      // 8. 创建交易记录（出库数量为负数）
      const transaction = queryRunner.manager.create(InventoryTransaction, {
        sku: dto.sku,
        productName: product.name,
        transactionType: dto.type,
        quantity: -dto.quantity,
        unitId: unit.id,
        beforeQty,
        afterQty,
        orderNo: dto.orderNo,
        locationId: dto.locationId || inventory.locationId,
        remark: dto.remark,
        tenantId,
      });
      const savedTransaction =
        await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      const inventoryUnitObj = this.toUnit(inventoryUnit);

      // 发送库存变更通知（异步，不阻塞返回）
      if (dto.notifyUserIds && dto.notifyUserIds.length > 0) {
        setImmediate(async () => {
          try {
            // 使用用户选择的单位
            const userUnit = this.toUnit(unit);
            await this.sendStockChangeNotification(
              tenantId,
              dto.sku,
              product.name,
              dto.type,
              dto.quantity,
              beforeQty,
              afterQty,
              userUnit.symbol,
              dto.notifyUserIds!,
            );
          } catch (error) {
            console.error('发送库存变更通知失败:', error);
          }
        });
      }

      // beforeQty 和 afterQty 是库存主单位的数量，需要换算成用户选择的单位
      let displayBeforeQty = beforeQty;
      let displayAfterQty = afterQty;

      // 如果用户选择的单位不是库存主单位，需要换算
      if (inventoryUnit.id !== unit.id) {
        displayBeforeQty = UnitConverter.convert(beforeQty, inventoryUnitObj, this.toUnit(unit));
        displayAfterQty = UnitConverter.convert(afterQty, inventoryUnitObj, this.toUnit(unit));
      }

      // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
      const normalizedBeforeQty = Math.round(displayBeforeQty * 100) / 100 === Math.floor(displayBeforeQty) ? Math.floor(displayBeforeQty) : Math.round(displayBeforeQty * 100) / 100;
      const normalizedAfterQty = Math.round(displayAfterQty * 100) / 100 === Math.floor(displayAfterQty) ? Math.floor(displayAfterQty) : Math.round(displayAfterQty * 100) / 100;

      return {
        sku: dto.sku,
        productName: inventory.productName,
        beforeQty: normalizedBeforeQty,
        afterQty: normalizedAfterQty,
        unit: this.toUnit(unit),  // 返回用户选择的单位
        transactionId: savedTransaction.id,
        // 添加格式化显示字段
        quantityDisplay: `-${formatNumber(dto.quantity)} ${unit.symbol}`,
        beforeQtyDisplay: `${formatNumber(normalizedBeforeQty)} ${unit.symbol}`,
        afterQtyDisplay: `${formatNumber(normalizedAfterQty)} ${unit.symbol}`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 批量出库
   */
  async batchOutbound(
    dto: BatchOutboundDto,
    tenantId: string,
  ): Promise<InventoryResult[]> {
    const results: InventoryResult[] = [];

    for (const item of dto.items) {
      const result = await this.outbound(
        {
          ...item,
          orderNo: dto.orderNo,
          locationId: dto.locationId,
          type: dto.type,
          remark: dto.remark,
        },
        tenantId,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 获取库存流水
   */
  async getTransactions(
    sku: string,
    tenantId: string,
  ): Promise<InventoryTransaction[]> {
    return this.transactionRepository.find({
      where: { sku, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 分页获取库存流水列表
   */
  async getTransactionsPage(
    tenantId: string,
    options: {
      page?: number;
      pageSize?: number;
      sku?: string;
      type?: string;
    } = {},
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, sku, type } = options;

    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');
    queryBuilder
      .leftJoin('units', 'unit', 'transaction.unitId = unit.id')
      .leftJoin('locations', 'location', 'transaction.locationId = location.id AND location.tenantId = :tenantId')
      .leftJoin('inventory', 'inventory', 'transaction.sku = inventory.sku AND transaction.tenantId = inventory.tenantId')
      .select([
        'transaction',
        'unit.name as unitName',
        'unit.code as unitCode',
        'unit.symbol as unitSymbol',
        'location.name as locationName',
        'location.code as locationCode',
        'inventory.unitId as inventoryUnitId',
      ])
      .where('transaction.tenantId = :tenantId', { tenantId });

    if (sku) {
      queryBuilder.andWhere('transaction.sku = :sku', { sku });
    }

    if (type) {
      queryBuilder.andWhere('transaction.transactionType = :type', { type });
    }

    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const result = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();

    // 获取总数
    const total = await queryBuilder.getCount();

    // 获取所有单位，用于单位换算
    const allUnits = await this.unitService.getAllUnits(tenantId);

    // 合并数据和单位信息，并添加格式化显示字段
    const list = result.entities.map((entity, index) => {
      const raw = result.raw[index];
      const quantity = Math.abs(Number(entity.quantity));

      // beforeQty 和 afterQty 在数据库中存储的是库存主单位的数量
      // 需要换算成当前流水记录的单位（用户操作时选择的单位）
      let beforeQty = Number(entity.beforeQty);
      let afterQty = Number(entity.afterQty);

      // 如果流水记录的单位不是库存主单位，需要将 beforeQty 和 afterQty 换算成流水单位
      if (raw.inventoryUnitId && entity.unitId && raw.inventoryUnitId !== entity.unitId) {
        const inventoryUnit = allUnits.find(u => u.id === raw.inventoryUnitId);
        const transactionUnit = allUnits.find(u => u.id === entity.unitId);

        if (inventoryUnit && transactionUnit) {
          // 将库存主单位数量换算成流水单位数量
          beforeQty = UnitConverter.convert(beforeQty, this.toUnit(inventoryUnit), this.toUnit(transactionUnit));
          afterQty = UnitConverter.convert(afterQty, this.toUnit(inventoryUnit), this.toUnit(transactionUnit));
        }
      }

      // 获取类型显示信息
      const transactionType = entity.transactionType as TransactionType;
      const typeDisplayName = TransactionTypeNames[transactionType] || transactionType;
      let typeDirection = 'OTHER';
      if (isInboundType(transactionType)) {
        typeDirection = 'INBOUND';
      } else if (isOutboundType(transactionType)) {
        typeDirection = 'OUTBOUND';
      }

      return {
        ...entity,
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        quantity: Math.round(quantity * 100) / 100 === Math.floor(quantity) ? Math.floor(quantity) : Math.round(quantity * 100) / 100,
        beforeQty: Math.round(beforeQty * 100) / 100 === Math.floor(beforeQty) ? Math.floor(beforeQty) : Math.round(beforeQty * 100) / 100,
        afterQty: Math.round(afterQty * 100) / 100 === Math.floor(afterQty) ? Math.floor(afterQty) : Math.round(afterQty * 100) / 100,
        unitName: raw.unitName,
        unitCode: raw.unitCode,
        unitSymbol: raw.unitSymbol,
        // 库位信息
        locationName: raw.locationName,
        locationCode: raw.locationCode,
        // 类型显示信息
        typeName: typeDisplayName,
        typeDirection: typeDirection, // INBOUND/OUTBOUND/OTHER
        // 格式化显示字段
        quantityDisplay: raw.unitSymbol ? `${formatNumber(quantity)} ${raw.unitSymbol}` : formatNumber(quantity),
        beforeQtyDisplay: raw.unitSymbol ? `${formatNumber(beforeQty)} ${raw.unitSymbol}` : formatNumber(beforeQty),
        afterQtyDisplay: raw.unitSymbol ? `${formatNumber(afterQty)} ${raw.unitSymbol}` : formatNumber(afterQty),
      };
    });

    return { list, total, page, pageSize };
  }

  /**
   * 分页获取入库流水列表
   */
  async getInboundTransactionsPage(
    tenantId: string,
    options: {
      page?: number;
      pageSize?: number;
      sku?: string;
      transactionType?: string;
    } = {},
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, sku, transactionType } = options;

    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');
    queryBuilder
      .leftJoin('units', 'unit', 'transaction.unitId = unit.id')
      .leftJoin('locations', 'location', 'transaction.locationId = location.id AND location.tenantId = :tenantId')
      .leftJoin('inventory', 'inventory', 'transaction.sku = inventory.sku AND transaction.tenantId = inventory.tenantId')
      .select([
        'transaction',
        'unit.name as unitName',
        'unit.code as unitCode',
        'unit.symbol as unitSymbol',
        'location.name as locationName',
        'location.code as locationCode',
        'inventory.unitId as inventoryUnitId',
      ])
      .where('transaction.tenantId = :tenantId', { tenantId });

    if (transactionType) {
      // 指定交易类型时，精确匹配
      queryBuilder.andWhere('transaction.transactionType = :transactionType', { transactionType });
    } else {
      // 未指定时，查询所有入库类型
      queryBuilder.andWhere(
        '(transaction.transactionType LIKE :inboundPrefix OR transaction.transactionType = :adjustmentIn)',
        { inboundPrefix: 'INBOUND_%', adjustmentIn: 'ADJUSTMENT_IN' },
      );
    }

    if (sku) {
      queryBuilder.andWhere('transaction.sku = :sku', { sku });
    }

    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const result = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();

    // 获取总数
    const total = await queryBuilder.getCount();

    // 获取所有单位，用于单位换算
    const allUnits = await this.unitService.getAllUnits(tenantId);

    // 合并数据和单位信息，并添加格式化显示字段
    const list = result.entities.map((entity, index) => {
      const raw = result.raw[index];
      const quantity = Math.abs(Number(entity.quantity));

      // beforeQty 和 afterQty 在数据库中存储的是库存主单位的数量
      // 需要换算成当前流水记录的单位（用户入库时选择的单位）
      let beforeQty = Number(entity.beforeQty);
      let afterQty = Number(entity.afterQty);

      // 如果流水记录的单位不是库存主单位，需要将 beforeQty 和 afterQty 换算成流水单位
      if (raw.inventoryUnitId && entity.unitId && raw.inventoryUnitId !== entity.unitId) {
        const inventoryUnit = allUnits.find(u => u.id === raw.inventoryUnitId);
        const transactionUnit = allUnits.find(u => u.id === entity.unitId);

        if (inventoryUnit && transactionUnit) {
          // 将库存主单位数量换算成流水单位数量
          beforeQty = UnitConverter.convert(beforeQty, this.toUnit(inventoryUnit), this.toUnit(transactionUnit));
          afterQty = UnitConverter.convert(afterQty, this.toUnit(inventoryUnit), this.toUnit(transactionUnit));
        }
      }

      // 获取类型显示信息
      const transactionType = entity.transactionType as TransactionType;
      const typeDisplayName = TransactionTypeNames[transactionType] || transactionType;

      return {
        ...entity,
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        quantity: Math.round(quantity * 100) / 100 === Math.floor(quantity) ? Math.floor(quantity) : Math.round(quantity * 100) / 100,
        beforeQty: Math.round(beforeQty * 100) / 100 === Math.floor(beforeQty) ? Math.floor(beforeQty) : Math.round(beforeQty * 100) / 100,
        afterQty: Math.round(afterQty * 100) / 100 === Math.floor(afterQty) ? Math.floor(afterQty) : Math.round(afterQty * 100) / 100,
        unitName: raw.unitName,
        unitCode: raw.unitCode,
        unitSymbol: raw.unitSymbol,
        // 库位信息
        locationName: raw.locationName,
        locationCode: raw.locationCode,
        // 类型显示信息
        typeName: typeDisplayName,
        // 格式化显示字段
        quantityDisplay: raw.unitSymbol ? `${formatNumber(quantity)} ${raw.unitSymbol}` : formatNumber(quantity),
        beforeQtyDisplay: raw.unitSymbol ? `${formatNumber(beforeQty)} ${raw.unitSymbol}` : formatNumber(beforeQty),
        afterQtyDisplay: raw.unitSymbol ? `${formatNumber(afterQty)} ${raw.unitSymbol}` : formatNumber(afterQty),
      };
    });

    return { list, total, page, pageSize };
  }

  /**
   * 分页获取出库流水列表
   */
  async getOutboundTransactionsPage(
    tenantId: string,
    options: {
      page?: number;
      pageSize?: number;
      sku?: string;
      transactionType?: string;
    } = {},
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, sku, transactionType } = options;

    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');
    queryBuilder
      .leftJoin('units', 'unit', 'transaction.unitId = unit.id')
      .leftJoin('locations', 'location', 'transaction.locationId = location.id AND location.tenantId = :tenantId')
      .leftJoin('inventory', 'inventory', 'transaction.sku = inventory.sku AND transaction.tenantId = inventory.tenantId')
      .select([
        'transaction',
        'unit.name as unitName',
        'unit.code as unitCode',
        'unit.symbol as unitSymbol',
        'location.name as locationName',
        'location.code as locationCode',
        'inventory.unitId as inventoryUnitId',
      ])
      .where('transaction.tenantId = :tenantId', { tenantId });

    if (transactionType) {
      // 指定交易类型时，精确匹配
      queryBuilder.andWhere('transaction.transactionType = :transactionType', { transactionType });
    } else {
      // 未指定时，查询所有出库类型
      queryBuilder.andWhere(
        '(transaction.transactionType LIKE :outboundPrefix OR transaction.transactionType = :adjustmentOut)',
        { outboundPrefix: 'OUTBOUND_%', adjustmentOut: 'ADJUSTMENT_OUT' },
      );
    }

    if (sku) {
      queryBuilder.andWhere('transaction.sku = :sku', { sku });
    }

    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const result = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();

    // 获取总数
    const total = await queryBuilder.getCount();

    // 获取所有单位，用于单位换算
    const allUnits = await this.unitService.getAllUnits(tenantId);

    // 合并数据和单位信息，并添加格式化显示字段
    const list = result.entities.map((entity, index) => {
      const raw = result.raw[index];
      const quantity = Math.abs(Number(entity.quantity));

      // beforeQty 和 afterQty 在数据库中存储的是库存主单位的数量
      // 需要换算成当前流水记录的单位（用户出库时选择的单位）
      let beforeQty = Number(entity.beforeQty);
      let afterQty = Number(entity.afterQty);

      // 如果流水记录的单位不是库存主单位，需要将 beforeQty 和 afterQty 换算成流水单位
      if (raw.inventoryUnitId && entity.unitId && raw.inventoryUnitId !== entity.unitId) {
        const inventoryUnit = allUnits.find(u => u.id === raw.inventoryUnitId);
        const transactionUnit = allUnits.find(u => u.id === entity.unitId);

        if (inventoryUnit && transactionUnit) {
          // 将库存主单位数量换算成流水单位数量
          beforeQty = UnitConverter.convert(beforeQty, this.toUnit(inventoryUnit), this.toUnit(transactionUnit));
          afterQty = UnitConverter.convert(afterQty, this.toUnit(inventoryUnit), this.toUnit(transactionUnit));
        }
      }

      // 获取类型显示信息
      const transactionType = entity.transactionType as TransactionType;
      const typeDisplayName = TransactionTypeNames[transactionType] || transactionType;

      return {
        ...entity,
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        quantity: Math.round(quantity * 100) / 100 === Math.floor(quantity) ? Math.floor(quantity) : Math.round(quantity * 100) / 100,
        beforeQty: Math.round(beforeQty * 100) / 100 === Math.floor(beforeQty) ? Math.floor(beforeQty) : Math.round(beforeQty * 100) / 100,
        afterQty: Math.round(afterQty * 100) / 100 === Math.floor(afterQty) ? Math.floor(afterQty) : Math.round(afterQty * 100) / 100,
        unitName: raw.unitName,
        unitCode: raw.unitCode,
        unitSymbol: raw.unitSymbol,
        // 库位信息
        locationName: raw.locationName,
        locationCode: raw.locationCode,
        // 类型显示信息
        typeName: typeDisplayName,
        // 格式化显示字段
        quantityDisplay: raw.unitSymbol ? `${formatNumber(quantity)} ${raw.unitSymbol}` : formatNumber(quantity),
        beforeQtyDisplay: raw.unitSymbol ? `${formatNumber(beforeQty)} ${raw.unitSymbol}` : formatNumber(beforeQty),
        afterQtyDisplay: raw.unitSymbol ? `${formatNumber(afterQty)} ${raw.unitSymbol}` : formatNumber(afterQty),
      };
    });

    return { list, total, page, pageSize };
  }

  /**
   * 获取库存告警列表（低库存）
   */
  async getAlerts(
    tenantId: string,
    options: {
      page?: number;
      pageSize?: number;
      isResolved?: string;
    } = {},
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10 } = options;

    // 查询库存数量低于安全库存的记录（关联产品表）
    const queryBuilder = this.inventoryRepository.createQueryBuilder('inventory');
    queryBuilder
      .leftJoin('inventory.unit', 'unit')
      .leftJoin('products', 'product', 'inventory.sku = product.code AND product.tenantId = :tenantId')
      .select([
        'inventory',
        'unit.name as unitName',
        'unit.code as unitCode',
        'unit.symbol as unitSymbol',
        'product.safetyStock as safetyStock',
      ])
      .where('inventory.tenantId = :tenantId', { tenantId })
      .andWhere('inventory.quantity < COALESCE(product.safetyStock, 0)')
      .orderBy('inventory.quantity', 'ASC')
      .addOrderBy('inventory.createdAt', 'DESC');

    const result = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();

    // 获取总数
    const total = await queryBuilder.getCount();

    // 获取所有单位，用于多单位库存显示
    const allUnits = await this.unitService.getAllUnits(tenantId);
    const unitMap = new Map(allUnits.map(u => [u.code, u]));

    // 计算预警级别
    const calculateAlertLevel = (quantity: number, safetyStock: number | null): AlertLevel => {
      const safetyStockNum = safetyStock ? Number(safetyStock) : 0;

      // 严重：零库存或库存<=0
      if (quantity <= 0) {
        return AlertLevel.CRITICAL;
      }

      // 如果没有设置安全库存，默认为 MEDIUM
      if (safetyStockNum === 0) {
        return AlertLevel.MEDIUM;
      }

      // 高：库存 < 安全库存*20%
      if (quantity < safetyStockNum * 0.2) {
        return AlertLevel.HIGH;
      }

      // 中：库存 < 安全库存*50%
      if (quantity < safetyStockNum * 0.5) {
        return AlertLevel.MEDIUM;
      }

      // 其他情况不属于预警范围（但这个方法只会在查询结果中被调用，查询条件已经是 quantity < safetyStock）
      return AlertLevel.MEDIUM;
    };

    // 格式化返回数据
    const list = result.entities.map((entity: any, index) => {
      const raw = result.raw[index];
      const numQuantity = Number(entity.quantity);
      const safetyStock = raw.safetyStock ? Number(raw.safetyStock) : 0;
      const alertLevel = calculateAlertLevel(numQuantity, safetyStock);
      const alertInfo = AlertLevelInfo[alertLevel];

      // 实时计算多单位库存（确保数据正确，不依赖数据库中可能过期的 multiUnitQty）
      const formattedMultiUnitQty: Record<string, any> = {};
      if (entity.unitId) {
        const inventoryUnit = allUnits.find(u => u.id === entity.unitId);
        if (inventoryUnit) {
          const inventoryUnitObj = this.toUnit(inventoryUnit);
          const allUnitObjs = allUnits.map(u => this.toUnit(u));
          const multiUnitQty = UnitConverter.convertToMultipleUnits(
            numQuantity,
            inventoryUnitObj,
            allUnitObjs,
          );

          for (const [unitCode, qty] of Object.entries(multiUnitQty)) {
            const unit = unitMap.get(unitCode);
            if (unit) {
              const numQty = Number(qty);
              formattedMultiUnitQty[unitCode] = {
                quantity: numQty,
                name: unit.name,
                symbol: unit.symbol,
                display: `${formatNumber(numQty)} ${unit.symbol}`
              };
            }
          }
        }
      }

      return {
        ...entity,
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        quantity: Math.round(numQuantity * 100) / 100 === Math.floor(numQuantity) ? Math.floor(numQuantity) : Math.round(numQuantity * 100) / 100,
        unitName: raw.unitName,
        unitCode: raw.unitCode,
        unitSymbol: raw.unitSymbol,
        // quantity 带单位显示（整数不显示小数位）
        quantityDisplay: raw.unitSymbol ? `${formatNumber(numQuantity)} ${raw.unitSymbol}` : formatNumber(numQuantity),
        // 多单位库存带单位信息（实时计算，整数不显示小数位）
        multiUnitQty: formattedMultiUnitQty,
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        safetyStock: Math.round(safetyStock * 100) / 100 === Math.floor(safetyStock) ? Math.floor(safetyStock) : Math.round(safetyStock * 100) / 100,
        // 格式化显示字段
        safetyStockDisplay: safetyStock > 0 ? `${formatNumber(safetyStock)} ${raw.unitSymbol || ''}` : '未设置',
        // 预警级别
        alertLevel: alertLevel,
        alertLevelValue: alertInfo?.level,
        alertLabel: alertInfo?.label,
        // 预警信息（语意化的提醒）
        alertMessage: alertInfo?.message,
        alertColor: alertInfo?.color,
      };
    });

    return { list, total, page, pageSize };
  }

  /**
   * 更新多单位库存
   */
  private async updateMultiUnitQty(
    queryRunner: any,
    inventory: Inventory,
    unit: any,
    tenantId: string,
  ): Promise<void> {
    const allUnits = await this.unitService.getAllUnits(tenantId);
    const unitObj = this.toUnit(unit);
    const multiUnitQty = UnitConverter.convertToMultipleUnits(
      Number(inventory.quantity),
      unitObj,
      allUnits.map((u) => this.toUnit(u)),
    );

    await queryRunner.manager.update(
      Inventory,
      { id: inventory.id },
      { multiUnitQty },
    );
  }

  /**
   * 将 Unit 实体转换为 Unit 接口
   */
  private toUnit(unit: any): Unit {
    return {
      id: unit.id,
      code: unit.code,
      name: unit.name,
      category: unit.category,
      baseRatio: Number(unit.baseRatio),
      baseUnitCode: unit.baseUnitCode,
      symbol: unit.symbol || unit.code,
    };
  }

  /**
   * 库存调整
   */
  async adjust(
    dto: import('./dto/adjust.dto').AdjustInventoryDto,
    tenantId: string,
  ): Promise<InventoryResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 验证产品并获取产品信息
      const product = await this.getProductBySku(dto.sku, tenantId);

      // 2. 获取单位信息
      const unit = await this.unitService.findByCode(dto.unitCode, tenantId);
      if (!unit) {
        // 检测是否传错了参数（SKU 被当作 unitCode）
        if (dto.unitCode?.toUpperCase().startsWith('SKU-')) {
          throw new BadRequestException(`参数错误：${dto.unitCode} 是产品编码(SKU)，不是单位编码。请检查请求参数中 sku 和 unitCode 是否正确填写。`);
        }
        throw new BadRequestException(`单位编码 ${dto.unitCode} 不存在`);
      }
      if (unit.isActive !== 1) {
        throw new BadRequestException('单位未启用');
      }

      // 3. 查找或创建库存记录
      let inventory = await queryRunner.manager.findOne(Inventory, {
        where: { sku: dto.sku, tenantId },
      });

      const beforeQty = inventory ? Number(inventory.quantity) : 0;
      let adjustedQty: number;

      // 4. 判断调整类型并计算调整后的数量
      const adjustType =
        dto.quantity >= 0
          ? TransactionType.ADJUSTMENT_IN
          : TransactionType.ADJUSTMENT_OUT;
      const absQuantity = Math.abs(dto.quantity);

      let inventoryUnit: any; // 库存主单位
      if (inventory && inventory.unitId) {
        // 库存记录存在且有单位，需要换算
        inventoryUnit = await this.unitService.findOne(
          inventory.unitId,
          tenantId,
        );
        adjustedQty = UnitConverter.convert(
          absQuantity,
          unit,
          this.toUnit(inventoryUnit),
        );

        // 如果是减少库存，检查是否充足
        if (adjustType === TransactionType.ADJUSTMENT_OUT && beforeQty < adjustedQty) {
          throw new BadRequestException(
            `库存不足: 当前${beforeQty}${inventoryUnit.symbol}, 需要调整${adjustedQty}${inventoryUnit.symbol}`,
          );
        }

        // 更新库存
        const newQty =
          adjustType === TransactionType.ADJUSTMENT_IN
            ? beforeQty + adjustedQty
            : beforeQty - adjustedQty;

        await queryRunner.manager.update(
          Inventory,
          { id: inventory.id },
          {
            quantity: newQty,
            productName: product.name,
          },
        );

        inventory = await queryRunner.manager.findOne(Inventory, {
          where: { id: inventory.id },
        });
      } else {
        // 库存记录不存在，创建新记录（调整只增加，不创建负库存）
        if (adjustType === TransactionType.ADJUSTMENT_OUT) {
          throw new BadRequestException('库存记录不存在，无法减少库存');
        }
        adjustedQty = absQuantity;
        inventoryUnit = unit; // 新建时，用户选择的单位就是库存主单位
        inventory = queryRunner.manager.create(Inventory, {
          sku: dto.sku,
          productName: product.name,
          quantity: adjustedQty,
          unitId: unit.id,
          locationId: dto.locationId,
          tenantId,
          multiUnitQty: null,
        });
        inventory = await queryRunner.manager.save(inventory);
      }

      // 5. 更新多单位库存（使用库存主单位）
      await this.updateMultiUnitQty(
        queryRunner,
        inventory!,
        inventoryUnit,
        tenantId,
      );

      const afterQty = Number(inventory!.quantity);

      // 6. 创建交易记录
      const transaction = queryRunner.manager.create(InventoryTransaction, {
        sku: dto.sku,
        productName: product.name,
        transactionType: adjustType,
        quantity: adjustType === TransactionType.ADJUSTMENT_IN ? absQuantity : -absQuantity,
        unitId: unit.id,
        beforeQty,
        afterQty,
        orderNo: null,
        locationId: dto.locationId || inventory?.locationId,
        remark: `${dto.reason}${dto.remark ? ': ' + dto.remark : ''}`,
        tenantId,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      const unitObj = this.toUnit(unit);

      // 发送库存变更通知（异步，不阻塞返回）
      if (dto.notifyUserIds && dto.notifyUserIds.length > 0) {
        setImmediate(async () => {
          try {
            await this.sendStockChangeNotification(
              tenantId,
              dto.sku,
              product.name,
              adjustType,
              absQuantity,
              beforeQty,
              afterQty,
              unitObj.symbol,
              dto.notifyUserIds!,
            );
          } catch (error) {
            console.error('发送库存变更通知失败:', error);
          }
        });
      }

      // beforeQty 和 afterQty 是库存主单位的数量，需要换算成用户选择的单位
      let displayBeforeQty = beforeQty;
      let displayAfterQty = afterQty;

      // 如果库存记录存在且有单位，且与用户选择的单位不同，需要换算
      if (inventory && inventory.unitId && inventory.unitId !== unit.id) {
        const inventoryUnit = await this.unitService.findOne(inventory.unitId, tenantId);
        if (inventoryUnit) {
          displayBeforeQty = UnitConverter.convert(beforeQty, this.toUnit(inventoryUnit), unitObj);
          displayAfterQty = UnitConverter.convert(afterQty, this.toUnit(inventoryUnit), unitObj);
        }
      }

      // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
      const normalizedBeforeQty = Math.round(displayBeforeQty * 100) / 100 === Math.floor(displayBeforeQty) ? Math.floor(displayBeforeQty) : Math.round(displayBeforeQty * 100) / 100;
      const normalizedAfterQty = Math.round(displayAfterQty * 100) / 100 === Math.floor(displayAfterQty) ? Math.floor(displayAfterQty) : Math.round(displayAfterQty * 100) / 100;
      const displayQuantity = adjustType === TransactionType.ADJUSTMENT_IN ? `+${formatNumber(absQuantity)}` : `-${formatNumber(absQuantity)}`;

      return {
        sku: dto.sku,
        productName: product.name,
        beforeQty: normalizedBeforeQty,
        afterQty: normalizedAfterQty,
        unit: unitObj,
        transactionId: transaction.id,
        // 添加格式化显示字段
        quantityDisplay: `${displayQuantity} ${unitObj.symbol}`,
        beforeQtyDisplay: `${formatNumber(normalizedBeforeQty)} ${unitObj.symbol}`,
        afterQtyDisplay: `${formatNumber(normalizedAfterQty)} ${unitObj.symbol}`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 发送库存预警通知
   *
   * 当库存低于安全库存时，发送通知给仓管员
   *
   * @param tenantId 租户ID
   * @param sku 产品SKU
   * @param productName 产品名称
   * @param currentQty 当前库存数量
   * @param safetyStock 安全库存数量
   * @param unitSymbol 单位符号
   * @param userIds 接收通知的用户ID列表（仓管员等）
   */
  private async sendStockWarningNotification(
    tenantId: string,
    sku: string,
    productName: string,
    currentQty: number,
    safetyStock: number,
    unitSymbol: string,
    userIds: string[],
  ): Promise<void> {
    // 如果没有指定接收用户，则不发送通知
    if (!userIds || userIds.length === 0) {
      return;
    }

    // 计算预警级别
    let alertLevel: AlertLevel;
    let priority: NotificationPriority;

    if (currentQty <= 0) {
      alertLevel = AlertLevel.CRITICAL;
      priority = NotificationPriority.URGENT;
    } else if (currentQty < safetyStock * 0.2) {
      alertLevel = AlertLevel.HIGH;
      priority = NotificationPriority.HIGH;
    } else {
      alertLevel = AlertLevel.MEDIUM;
      priority = NotificationPriority.NORMAL;
    }

    const alertInfo = AlertLevelInfo[alertLevel];

    await this.notificationsService.sendToUsers({
      tenantId,
      userIds,
      type: NotificationType.SYSTEM,
      category: NotificationCategory.INVENTORY_WARNING,
      title: `库存预警 - ${alertInfo?.label || '需要注意'}`,
      message: `【${productName}(${sku})】当前库存 ${currentQty}${unitSymbol}，低于安全库存 ${safetyStock}${unitSymbol}。${alertInfo?.message || ''}`,
      data: {
        sku,
        productName,
        currentQty,
        safetyStock,
        unitSymbol,
        alertLevel,
        alertLabel: alertInfo?.label,
      },
      priority,
    });
  }

  /**
   * 发送库存变更通知
   *
   * 在库存发生变更时发送通知（如入库、出库等）
   *
   * @param tenantId 租户ID
   * @param sku 产品SKU
   * @param productName 产品名称
   * @param transactionType 交易类型
   * @param quantity 变更数量
   * @param beforeQty 变更前库存
   * @param afterQty 变更后库存
   * @param unitSymbol 单位符号
   * @param userIds 接收通知的用户ID列表
   */
  private async sendStockChangeNotification(
    tenantId: string,
    sku: string,
    productName: string,
    transactionType: TransactionType,
    quantity: number,
    beforeQty: number,
    afterQty: number,
    unitSymbol: string,
    userIds: string[],
  ): Promise<void> {
    // 如果没有指定接收用户，则不发送通知
    if (!userIds || userIds.length === 0) {
      return;
    }

    // 判断是入库还是出库
    const isInbound = isInboundType(transactionType);
    const typeDisplayName = TransactionTypeNames[transactionType] || transactionType;
    const direction = isInbound ? '入库' : '出库';
    const quantityDisplay = isInbound ? `+${quantity}` : `${quantity}`;

    await this.notificationsService.sendToUsers({
      tenantId,
      userIds,
      type: NotificationType.SYSTEM,
      category: NotificationCategory.INVENTORY_CHANGE,
      title: `库存${direction}通知`,
      message: `【${productName}(${sku})】${typeDisplayName} ${quantityDisplay}${unitSymbol}，库存从 ${beforeQty}${unitSymbol} 变更为 ${afterQty}${unitSymbol}`,
      data: {
        sku,
        productName,
        transactionType,
        typeDisplayName,
        direction,
        quantity,
        beforeQty,
        afterQty,
        unitSymbol,
      },
      priority: NotificationPriority.NORMAL,
    });
  }

  /**
   * 检查并发送库存预警通知
   *
   * 在库存变更后检查是否需要发送预警通知
   *
   * @param tenantId 租户ID
   * @param sku 产品SKU
   * @param afterQty 变更后的库存数量
   * @param userIds 接收通知的用户ID列表
   */
  private async checkAndSendStockWarning(
    tenantId: string,
    sku: string,
    afterQty: number,
    userIds: string[],
  ): Promise<void> {
    // 查询产品信息获取安全库存
    const product = await this.productRepository.findOne({
      where: { code: sku, tenantId },
    });

    if (!product || !product.safetyStock || product.safetyStock <= 0) {
      // 没有设置安全库存，不发送预警
      return;
    }

    // 查询库存记录获取单位信息
    const inventory = await this.inventoryRepository.findOne({
      where: { sku, tenantId },
      relations: ['unit'],
    });

    if (!inventory) {
      return;
    }

    const safetyStock = Number(product.safetyStock);
    const currentQty = Number(afterQty);

    // 只有当前库存低于安全库存时才发送预警
    if (currentQty < safetyStock) {
      await this.sendStockWarningNotification(
        tenantId,
        sku,
        inventory.productName,
        currentQty,
        safetyStock,
        inventory.unit?.symbol || '',
        userIds,
      );
    }
  }
}
