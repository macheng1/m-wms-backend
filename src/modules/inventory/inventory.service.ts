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
import { InventoryResult, InventoryUnitResult } from './dto/inventory-result.dto';
import { UnitService } from '../unit/unit.service';
import {
  isInboundType,
  isOutboundType,
  TransactionType,
  TransactionTypeNames,
} from '../../common/constants/unit.constant';
import { Product } from '../product/product.entity';
import { InventoryLocation } from '../location/entities/inventory-location.entity';
import { Location, LocationStatus } from '../location/entities/location.entity';
import { Device } from '../location/entities/device.entity';
import { PtlLocationBinding } from '../ptl/entities/ptl-location-binding.entity';
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
    @InjectRepository(InventoryLocation)
    private inventoryLocationRepository: Repository<InventoryLocation>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
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
      relations: ['inventoryUnit'],
    });
    if (!product) {
      throw new NotFoundException(`SKU ${sku} 对应的产品不存在`);
    }
    return product;
  }

  private getProductInventoryUnit(product: Product) {
    if (!product.unitId || !(product as any).inventoryUnit) {
      throw new BadRequestException(`产品 ${product.name} 未维护库存主单位，请先在产品资料中选择单位`);
    }
    return (product as any).inventoryUnit;
  }

  private ensureRequestUnitMatchesProductUnit(
    unitCode: string | undefined,
    inventoryUnit: any,
    actionName: string,
  ) {
    if (!unitCode) return;
    if (unitCode !== inventoryUnit.code) {
      throw new BadRequestException(
        `${actionName}单位必须使用产品库存单位：${inventoryUnit.name}(${inventoryUnit.code})`,
      );
    }
  }

  private async getConvertibleOperationUnit(
    unitCode: string | undefined,
    inventoryUnit: any,
    tenantId: string,
    actionName: string,
  ) {
    if (!unitCode || unitCode === inventoryUnit.code) {
      return { unit: inventoryUnit, conversionRatio: 1 };
    }

    const unit = await this.unitService.findByCode(unitCode, tenantId);
    if (!unit) {
      throw new BadRequestException(`单位编码 ${unitCode} 不存在`);
    }
    if (unit.isActive !== 1) {
      throw new BadRequestException('单位未启用');
    }

    const directConversion = await this.unitService.findConversion(unit.code, inventoryUnit.code, tenantId);
    if (directConversion) {
      return { unit, conversionRatio: Number(directConversion.ratio) };
    }

    throw new BadRequestException(
      `${actionName}单位 ${unit.name} 未维护到产品库存单位 ${inventoryUnit.name} 的换算关系`,
    );
  }

  private convertToInventoryUnit(
    quantity: number,
    fromUnit: any,
    inventoryUnit: any,
    conversionRatio?: number | null,
  ) {
    if (conversionRatio) {
      return Math.round(Number(quantity) * conversionRatio * 100) / 100;
    }
    if (fromUnit.code === inventoryUnit.code) {
      return Number(quantity);
    }
    throw new BadRequestException(
      `单位 ${fromUnit.name} 未维护到产品库存单位 ${inventoryUnit.name} 的换算关系`,
    );
  }

  private async updateLocationOccupancy(
    queryRunner: any,
    locationId: string,
    tenantId: string,
  ): Promise<void> {
    const stock = await queryRunner.manager
      .createQueryBuilder(InventoryLocation, 'inventoryLocation')
      .select('COALESCE(SUM(inventoryLocation.quantity), 0)', 'quantity')
      .where('inventoryLocation.tenantId = :tenantId', { tenantId })
      .andWhere('inventoryLocation.locationId = :locationId', { locationId })
      .getRawOne();

    const quantity = Number(stock?.quantity || 0);
    const location = await queryRunner.manager.findOne(Location, {
      where: { id: locationId, tenantId },
    });

    if (!location || location.status === LocationStatus.DISABLED) return;

    await queryRunner.manager.update(
      Location,
      { id: locationId, tenantId },
      {
        status:
          quantity > 0 ? LocationStatus.OCCUPIED : LocationStatus.AVAILABLE,
      },
    );
  }

  private async changeLocationStock(
    queryRunner: any,
    options: {
      tenantId: string;
      sku: string;
      productName: string;
      locationId?: string;
      unitId?: string;
      quantityDelta: number;
    },
  ): Promise<void> {
    const { tenantId, sku, productName, locationId, unitId, quantityDelta } =
      options;

    if (!locationId || quantityDelta === 0) return;

    const location = await queryRunner.manager.findOne(Location, {
      where: { id: locationId, tenantId },
    });
    if (!location) {
      throw new BadRequestException('库位不存在');
    }
    if (location.status === LocationStatus.DISABLED) {
      throw new BadRequestException('库位已禁用，不能进行库存操作');
    }

    let stock = await queryRunner.manager.findOne(InventoryLocation, {
      where: { tenantId, sku, locationId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!stock) {
      if (quantityDelta < 0) {
        throw new BadRequestException(`库位 ${location.code} 没有 SKU ${sku} 的库存`);
      }

      stock = queryRunner.manager.create(InventoryLocation, {
        tenantId,
        sku,
        productName,
        locationId,
        unitId,
        quantity: quantityDelta,
        lockedQuantity: 0,
      });
      await queryRunner.manager.save(stock);
      await this.updateLocationOccupancy(queryRunner, locationId, tenantId);
      return;
    }

    const beforeQty = Number(stock.quantity || 0);
    const nextQty = beforeQty + quantityDelta;
    const lockedQty = Number(stock.lockedQuantity || 0);

    if (nextQty < 0) {
      throw new BadRequestException(
        `库位 ${location.code} 库存不足: 当前${beforeQty}, 需要扣减${Math.abs(quantityDelta)}`,
      );
    }
    if (nextQty < lockedQty) {
      throw new BadRequestException(
        `库位 ${location.code} 存在锁定库存，不能扣减到锁定数量以下`,
      );
    }

    await queryRunner.manager.update(
      InventoryLocation,
      { id: stock.id },
      {
        productName,
        unitId: stock.unitId || unitId,
        quantity: nextQty,
      },
    );
    await this.updateLocationOccupancy(queryRunner, locationId, tenantId);
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

  async findLocationsBySku(
    tenantId: string,
    options: { sku: string; onlyAvailable?: boolean },
  ): Promise<{
    sku: string;
    productName: string;
    unitId?: string;
    unitName?: string;
    unitSymbol?: string;
    totalQuantity: number;
    totalLockedQuantity: number;
    totalAvailableQuantity: number;
    locations: any[];
  }> {
    if (!options.sku) {
      throw new BadRequestException('sku 不能为空');
    }

    const query = this.inventoryLocationRepository
      .createQueryBuilder('inventoryLocation')
      .innerJoin(Location, 'location', 'location.id = inventoryLocation.locationId')
      .leftJoin('units', 'unit', 'unit.id = inventoryLocation.unitId')
      .leftJoin(
        PtlLocationBinding,
        'binding',
        'binding.locationId = location.id AND binding.tenantId = :tenantId AND binding.enabled = 1',
        { tenantId },
      )
      .leftJoin(Device, 'device', 'device.id = binding.deviceId AND device.tenantId = :tenantId', {
        tenantId,
      })
      .select([
        'inventoryLocation.id as inventoryLocationId',
        'inventoryLocation.sku as sku',
        'inventoryLocation.productName as productName',
        'inventoryLocation.quantity as quantity',
        'inventoryLocation.lockedQuantity as lockedQuantity',
        'inventoryLocation.unitId as unitId',
        'inventoryLocation.batchNo as batchNo',
        'inventoryLocation.productionDate as productionDate',
        'inventoryLocation.expiryDate as expiryDate',
        'location.id as locationId',
        'location.code as locationCode',
        'location.name as locationName',
        'location.type as locationType',
        'location.status as locationStatus',
        'unit.name as unitName',
        'unit.symbol as unitSymbol',
        'binding.id as ptlBindingId',
        'binding.ledIndex as ledIndex',
        'binding.defaultColor as defaultColor',
        'device.id as ptlControllerId',
        'device.code as ptlControllerCode',
        'device.name as ptlControllerName',
        'device.status as ptlControllerStatus',
      ])
      .where('inventoryLocation.tenantId = :tenantId', { tenantId })
      .andWhere('inventoryLocation.sku = :sku', { sku: options.sku });

    if (options.onlyAvailable) {
      query.andWhere('(inventoryLocation.quantity - inventoryLocation.lockedQuantity) > 0');
    }

    query
      .orderBy('(inventoryLocation.quantity - inventoryLocation.lockedQuantity)', 'DESC')
      .addOrderBy('inventoryLocation.expiryDate', 'ASC');

    const rows = await query.getRawMany();
    const locations = rows.map((row) => {
      const quantity = Number(row.quantity || 0);
      const lockedQuantity = Number(row.lockedQuantity || 0);
      const availableQuantity = quantity - lockedQuantity;

      return {
        inventoryLocationId: row.inventoryLocationId,
        locationId: row.locationId,
        locationCode: row.locationCode,
        locationName: row.locationName,
        locationType: row.locationType,
        locationStatus: row.locationStatus,
        quantity,
        lockedQuantity,
        availableQuantity,
        unitId: row.unitId,
        unitName: row.unitName,
        unitSymbol: row.unitSymbol,
        batchNo: row.batchNo,
        productionDate: row.productionDate,
        expiryDate: row.expiryDate,
        ptl: {
          bound: Boolean(row.ptlBindingId),
          bindingId: row.ptlBindingId,
          controllerId: row.ptlControllerId,
          controllerCode: row.ptlControllerCode,
          controllerName: row.ptlControllerName,
          controllerStatus: row.ptlControllerStatus,
          ledIndex: row.ledIndex === null || row.ledIndex === undefined ? null : Number(row.ledIndex),
          defaultColor: row.defaultColor,
        },
      };
    });

    const totals = locations.reduce(
      (acc, item) => {
        acc.totalQuantity += item.quantity;
        acc.totalLockedQuantity += item.lockedQuantity;
        acc.totalAvailableQuantity += item.availableQuantity;
        return acc;
      },
      { totalQuantity: 0, totalLockedQuantity: 0, totalAvailableQuantity: 0 },
    );

    return {
      sku: options.sku,
      productName: rows[0]?.productName || '',
      unitId: rows[0]?.unitId,
      unitName: rows[0]?.unitName,
      unitSymbol: rows[0]?.unitSymbol,
      ...totals,
      locations,
    };
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
        'unit.category as unitCategory',
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
      queryBuilder.andWhere('(inventory.quantity - COALESCE(inventory.lockedQuantity, 0)) = 0');
    } else if (stockStatus === 'LOW_STOCK') {
      queryBuilder.andWhere('(inventory.quantity - COALESCE(inventory.lockedQuantity, 0)) > 0 AND (inventory.quantity - COALESCE(inventory.lockedQuantity, 0)) < COALESCE(product.safetyStock, 0)');
    } else if (stockStatus === 'IN_STOCK') {
      queryBuilder.andWhere('(inventory.quantity - COALESCE(inventory.lockedQuantity, 0)) >= COALESCE(product.safetyStock, 0)');
      queryBuilder.andWhere('product.safetyStock IS NOT NULL');
    }

    queryBuilder.orderBy('inventory.createdAt', 'DESC');

    const result = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();

    // 获取总数
    const total = await queryBuilder.getCount();

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
      const lockedQuantity = Number(entity.lockedQuantity || 0);
      const availableQuantity = Math.max(numQuantity - lockedQuantity, 0);
      const safetyStock = raw.safetyStock ? Number(raw.safetyStock) : 0;
      const status = calculateStockStatus(availableQuantity, safetyStock);

      return {
        ...entity,
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        quantity: Math.round(numQuantity * 100) / 100 === Math.floor(numQuantity) ? Math.floor(numQuantity) : Math.round(numQuantity * 100) / 100,
        unitName: raw.unitName,
        unitCode: raw.unitCode,
        unitCategory: raw.unitCategory,
        unitSymbol: raw.unitSymbol,
        // 库位信息
        locationName: raw.locationName,
        locationCode: raw.locationCode,
        // quantity 带单位显示（整数不显示小数位）
        quantityDisplay: raw.unitSymbol
          ? `${formatNumber(numQuantity)} ${raw.unitSymbol}`
          : `${formatNumber(numQuantity)}`,
        lockedQuantity: Math.round(lockedQuantity * 100) / 100 === Math.floor(lockedQuantity) ? Math.floor(lockedQuantity) : Math.round(lockedQuantity * 100) / 100,
        lockedQuantityDisplay: raw.unitSymbol
          ? `${formatNumber(lockedQuantity)} ${raw.unitSymbol}`
          : `${formatNumber(lockedQuantity)}`,
        availableQuantity: Math.round(availableQuantity * 100) / 100 === Math.floor(availableQuantity) ? Math.floor(availableQuantity) : Math.round(availableQuantity * 100) / 100,
        availableQuantityDisplay: raw.unitSymbol
          ? `${formatNumber(availableQuantity)} ${raw.unitSymbol}`
          : `${formatNumber(availableQuantity)}`,
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
      unitCode: string;
      unitName: string;
      unitSymbol: string;
    }>
  > {
    const { keyword } = options;

    const queryBuilder = this.inventoryRepository.createQueryBuilder('inventory');
    queryBuilder
      .leftJoin('inventory.unit', 'unit')
      .select('inventory.sku', 'sku')
      .addSelect('MAX(inventory.productName)', 'productName')
      .addSelect('SUM(inventory.quantity - COALESCE(inventory.lockedQuantity, 0))', 'availableQuantity')
      .addSelect('MAX(unit.code)', 'unitCode')
      .addSelect('MAX(unit.name)', 'unitName')
      .addSelect('MAX(unit.symbol)', 'unitSymbol')
      .where('inventory.tenantId = :tenantId', { tenantId })
      .groupBy('inventory.sku')
      .having('SUM(inventory.quantity - COALESCE(inventory.lockedQuantity, 0)) > 0');

    if (keyword) {
      queryBuilder.andWhere(
        '(inventory.sku LIKE :keyword OR inventory.productName LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    queryBuilder
      .orderBy('inventory.sku', 'ASC')
      .take(100); // 限制最多返回100条

    const result = await queryBuilder.getRawMany();

    return result.map((item) => ({
      value: item.sku,
      label: `${item.productName} (${item.sku}) - 可用: ${formatNumber(item.availableQuantity)}${item.unitSymbol || ''}`,
      sku: item.sku,
      productName: item.productName,
      quantity: Number(item.availableQuantity || 0),
      unitCode: item.unitCode,
      unitName: item.unitName,
      unitSymbol: item.unitSymbol,
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
      if (dto.quantity <= 0) {
        throw new BadRequestException('入库数量必须大于 0');
      }
      if (!isInboundType(dto.type)) {
        throw new BadRequestException('入库操作不能使用出库类型');
      }

      // 1. 验证产品并获取产品信息（SKU 即为产品 code）
      const product = await this.getProductBySku(dto.sku, tenantId);

      const inventoryUnit = this.getProductInventoryUnit(product);
      const operation = await this.getConvertibleOperationUnit(
        dto.unitCode,
        inventoryUnit,
        tenantId,
        '入库',
      );
      const operationUnit = operation.unit;
      if (inventoryUnit.isActive !== 1) {
        throw new BadRequestException('单位未启用');
      }

      // 2. 查找或创建库存记录
      let inventory = await queryRunner.manager.findOne(Inventory, {
        where: { sku: dto.sku, tenantId },
      });

      const beforeQty = inventory ? Number(inventory.quantity) : 0;
      const inputQty = Number(dto.quantity);
      const stockQty = this.convertToInventoryUnit(
        inputQty,
        operationUnit,
        inventoryUnit,
        operation.conversionRatio,
      );

      if (inventory) {
        if (inventory.unitId && inventory.unitId !== inventoryUnit.id) {
          throw new BadRequestException('库存单位与产品库存主单位不一致，请先同步库存单位');
        }

        // 3. 更新库存（同时更新产品名称，以防产品名称变更）
        await queryRunner.manager.update(
          Inventory,
          { id: inventory.id },
          {
            quantity: beforeQty + stockQty,
            productName: product.name,
            unitId: inventoryUnit.id,
          },
        );

        inventory = await queryRunner.manager.findOne(Inventory, {
          where: { id: inventory.id },
        });
      } else {
        // 库存记录不存在，按产品库存主单位创建
        inventory = queryRunner.manager.create(Inventory, {
          sku: dto.sku,
          productName: product.name, // 使用产品表中的名称
          quantity: stockQty,
          unitId: inventoryUnit.id,
          locationId: dto.locationId,
          tenantId,
        });
        inventory = await queryRunner.manager.save(inventory);
      }

      await this.changeLocationStock(queryRunner, {
        tenantId,
        sku: dto.sku,
        productName: product.name,
        locationId: dto.locationId || inventory!.locationId,
        unitId: inventoryUnit.id,
        quantityDelta: stockQty,
      });

      const afterQty = Number(inventory!.quantity);

      // 5. 创建交易记录
      const transaction = queryRunner.manager.create(InventoryTransaction, {
        sku: dto.sku,
        productName: product.name,
        transactionType: dto.type,
        quantity: inputQty,
        unitId: operationUnit.id,
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

      const unitObj = this.toUnit(inventoryUnit);
      const operationUnitObj = this.toUnit(operationUnit);

      // 发送库存变更通知（异步，不阻塞返回）
      if (dto.notifyUserIds && dto.notifyUserIds.length > 0) {
        setImmediate(async () => {
          try {
            await this.sendStockChangeNotification(
              tenantId,
              dto.sku,
              product.name,
              dto.type,
              inputQty,
              beforeQty,
              afterQty,
              operationUnitObj.symbol,
              dto.notifyUserIds!,
            );
          } catch (error) {
            console.error('发送库存变更通知失败:', error);
          }
        });
      }

      // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
      const normalizedBeforeQty = Math.round(beforeQty * 100) / 100 === Math.floor(beforeQty) ? Math.floor(beforeQty) : Math.round(beforeQty * 100) / 100;
      const normalizedAfterQty = Math.round(afterQty * 100) / 100 === Math.floor(afterQty) ? Math.floor(afterQty) : Math.round(afterQty * 100) / 100;

      return {
        sku: dto.sku,
        productName: inventory!.productName,
        beforeQty: normalizedBeforeQty,
        afterQty: normalizedAfterQty,
        unit: unitObj,
        transactionId: savedTransaction.id,
        // 添加格式化显示字段
        quantityDisplay: `+${formatNumber(inputQty)} ${operationUnitObj.symbol}`,
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
          locationId: item.locationId || dto.locationId,
          type: dto.type,
          remark: dto.remark,
          notifyUserIds: dto.notifyUserIds,
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
      if (dto.quantity <= 0) {
        throw new BadRequestException('出库数量必须大于 0');
      }
      if (!isOutboundType(dto.type)) {
        throw new BadRequestException('出库操作不能使用入库类型');
      }

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
      const lockedQty = Number(inventory.lockedQuantity || 0);
      const availableQty = Math.max(beforeQty - lockedQty, 0);

      // 3. 获取产品库存主单位，并校验库存记录一致
      const inventoryUnit = this.getProductInventoryUnit(product);
      if (inventory.unitId && inventory.unitId !== inventoryUnit.id) {
        throw new BadRequestException('库存单位与产品库存主单位不一致，请先同步库存单位');
      }

      this.ensureRequestUnitMatchesProductUnit(dto.unitCode, inventoryUnit, '出库');
      if (inventoryUnit.isActive !== 1) {
        throw new BadRequestException('单位未启用');
      }

      const outboundQty = Number(dto.quantity);

      // 4. 检查可用库存是否充足，不能扣减已锁定库存
      if (availableQty < outboundQty) {
        throw new BadRequestException(
          `可用库存不足: 当前可用${availableQty}${inventoryUnit.symbol}, 需要出库${outboundQty}${inventoryUnit.symbol}`,
        );
      }

      const locationId = dto.locationId || inventory.locationId;

      await this.changeLocationStock(queryRunner, {
        tenantId,
        sku: dto.sku,
        productName: product.name,
        locationId,
        unitId: inventoryUnit.id,
        quantityDelta: -outboundQty,
      });

      // 5. 更新库存
      const afterQty = beforeQty - outboundQty;
      await queryRunner.manager.update(
        Inventory,
        { id: inventory.id },
          {
            quantity: afterQty,
            unitId: inventoryUnit.id,
          },
        );

      // 6. 创建交易记录（出库数量为负数）
      const transaction = queryRunner.manager.create(InventoryTransaction, {
        sku: dto.sku,
        productName: product.name,
        transactionType: dto.type,
        quantity: -outboundQty,
        unitId: inventoryUnit.id,
        beforeQty,
        afterQty,
        orderNo: dto.orderNo,
        locationId,
        remark: dto.remark,
        tenantId,
      });
      const savedTransaction =
        await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      const unitObj = this.toUnit(inventoryUnit);

      // 发送库存变更通知（异步，不阻塞返回）
      if (dto.notifyUserIds && dto.notifyUserIds.length > 0) {
        setImmediate(async () => {
          try {
            await this.sendStockChangeNotification(
              tenantId,
              dto.sku,
              product.name,
              dto.type,
              outboundQty,
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

      // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
      const normalizedBeforeQty = Math.round(beforeQty * 100) / 100 === Math.floor(beforeQty) ? Math.floor(beforeQty) : Math.round(beforeQty * 100) / 100;
      const normalizedAfterQty = Math.round(afterQty * 100) / 100 === Math.floor(afterQty) ? Math.floor(afterQty) : Math.round(afterQty * 100) / 100;

      return {
        sku: dto.sku,
        productName: inventory.productName,
        beforeQty: normalizedBeforeQty,
        afterQty: normalizedAfterQty,
        unit: unitObj,
        transactionId: savedTransaction.id,
        // 添加格式化显示字段
        quantityDisplay: `-${formatNumber(outboundQty)} ${unitObj.symbol}`,
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
          locationId: item.locationId || dto.locationId,
          type: dto.type,
          remark: dto.remark,
          notifyUserIds: dto.notifyUserIds,
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

  private getTransactionDirection(transactionType: TransactionType) {
    if (isInboundType(transactionType) || transactionType === TransactionType.STOCK_RELEASE) {
      return 'INBOUND';
    }
    if (isOutboundType(transactionType) || transactionType === TransactionType.STOCK_LOCK) {
      return 'OUTBOUND';
    }
    return 'OTHER';
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
      .leftJoin('products', 'product', 'transaction.sku = product.code AND transaction.tenantId = product.tenantId')
      .leftJoin('units', 'inventoryUnit', 'product.unitId = inventoryUnit.id')
      .select([
        'transaction',
        'unit.name as unitName',
        'unit.code as unitCode',
        'unit.category as unitCategory',
        'unit.symbol as unitSymbol',
        'location.name as locationName',
        'location.code as locationCode',
        'product.unitId as inventoryUnitId',
        'inventoryUnit.name as inventoryUnitName',
        'inventoryUnit.code as inventoryUnitCode',
        'inventoryUnit.category as inventoryUnitCategory',
        'inventoryUnit.symbol as inventoryUnitSymbol',
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

    // 合并数据和单位信息，并添加格式化显示字段
    const list = result.entities.map((entity, index) => {
      const raw = result.raw[index];
      const quantity = Math.abs(Number(entity.quantity));

      const beforeQty = Number(entity.beforeQty);
      const afterQty = Number(entity.afterQty);
      const stockQtyUnitSymbol = raw.inventoryUnitSymbol || raw.unitSymbol;

      // 获取类型显示信息
      const transactionType = entity.transactionType as TransactionType;
      const typeDisplayName = TransactionTypeNames[transactionType] || transactionType;
      const typeDirection = this.getTransactionDirection(transactionType);

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
        beforeQtyDisplay: stockQtyUnitSymbol ? `${formatNumber(beforeQty)} ${stockQtyUnitSymbol}` : formatNumber(beforeQty),
        afterQtyDisplay: stockQtyUnitSymbol ? `${formatNumber(afterQty)} ${stockQtyUnitSymbol}` : formatNumber(afterQty),
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
      .leftJoin('products', 'product', 'transaction.sku = product.code AND transaction.tenantId = product.tenantId')
      .leftJoin('units', 'inventoryUnit', 'product.unitId = inventoryUnit.id')
      .select([
        'transaction',
        'unit.name as unitName',
        'unit.code as unitCode',
        'unit.category as unitCategory',
        'unit.symbol as unitSymbol',
        'location.name as locationName',
        'location.code as locationCode',
        'product.unitId as inventoryUnitId',
        'inventoryUnit.name as inventoryUnitName',
        'inventoryUnit.code as inventoryUnitCode',
        'inventoryUnit.category as inventoryUnitCategory',
        'inventoryUnit.symbol as inventoryUnitSymbol',
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

    // 合并数据和单位信息，并添加格式化显示字段
    const list = result.entities.map((entity, index) => {
      const raw = result.raw[index];
      const quantity = Math.abs(Number(entity.quantity));

      const beforeQty = Number(entity.beforeQty);
      const afterQty = Number(entity.afterQty);
      const stockQtyUnitSymbol = raw.inventoryUnitSymbol || raw.unitSymbol;

      // 获取类型显示信息
      const transactionType = entity.transactionType as TransactionType;
      const typeDisplayName = TransactionTypeNames[transactionType] || transactionType;
      const typeDirection = this.getTransactionDirection(transactionType);

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
        typeDirection,
        // 格式化显示字段
        quantityDisplay: raw.unitSymbol ? `${formatNumber(quantity)} ${raw.unitSymbol}` : formatNumber(quantity),
        beforeQtyDisplay: stockQtyUnitSymbol ? `${formatNumber(beforeQty)} ${stockQtyUnitSymbol}` : formatNumber(beforeQty),
        afterQtyDisplay: stockQtyUnitSymbol ? `${formatNumber(afterQty)} ${stockQtyUnitSymbol}` : formatNumber(afterQty),
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
      .leftJoin('products', 'product', 'transaction.sku = product.code AND transaction.tenantId = product.tenantId')
      .leftJoin('units', 'inventoryUnit', 'product.unitId = inventoryUnit.id')
      .select([
        'transaction',
        'unit.name as unitName',
        'unit.code as unitCode',
        'unit.category as unitCategory',
        'unit.symbol as unitSymbol',
        'location.name as locationName',
        'location.code as locationCode',
        'product.unitId as inventoryUnitId',
        'inventoryUnit.name as inventoryUnitName',
        'inventoryUnit.code as inventoryUnitCode',
        'inventoryUnit.category as inventoryUnitCategory',
        'inventoryUnit.symbol as inventoryUnitSymbol',
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

    // 合并数据和单位信息，并添加格式化显示字段
    const list = result.entities.map((entity, index) => {
      const raw = result.raw[index];
      const quantity = Math.abs(Number(entity.quantity));

      const beforeQty = Number(entity.beforeQty);
      const afterQty = Number(entity.afterQty);
      const stockQtyUnitSymbol = raw.inventoryUnitSymbol || raw.unitSymbol;

      // 获取类型显示信息
      const transactionType = entity.transactionType as TransactionType;
      const typeDisplayName = TransactionTypeNames[transactionType] || transactionType;
      const typeDirection = this.getTransactionDirection(transactionType);

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
        typeDirection,
        // 格式化显示字段
        quantityDisplay: raw.unitSymbol ? `${formatNumber(quantity)} ${raw.unitSymbol}` : formatNumber(quantity),
        beforeQtyDisplay: stockQtyUnitSymbol ? `${formatNumber(beforeQty)} ${stockQtyUnitSymbol}` : formatNumber(beforeQty),
        afterQtyDisplay: stockQtyUnitSymbol ? `${formatNumber(afterQty)} ${stockQtyUnitSymbol}` : formatNumber(afterQty),
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

    // 查询可用库存低于安全库存的记录（关联产品表）。
    // 先分页查 ID，再查详情，避免 TypeORM 在 join + take 场景下生成 DISTINCT 外层查询时丢失排序别名。
    const baseQueryBuilder = this.inventoryRepository.createQueryBuilder('inventory');
    baseQueryBuilder
      .leftJoin('products', 'product', 'inventory.sku = product.code AND product.tenantId = :tenantId')
      .where('inventory.tenantId = :tenantId', { tenantId })
      .andWhere('(inventory.quantity - COALESCE(inventory.lockedQuantity, 0)) < COALESCE(product.safetyStock, 0)');

    const total = await baseQueryBuilder.clone().getCount();
    const idRows = await baseQueryBuilder
      .clone()
      .select('inventory.id', 'id')
      .addSelect('(inventory.quantity - COALESCE(inventory.lockedQuantity, 0))', 'availableQuantitySort')
      .orderBy('availableQuantitySort', 'ASC')
      .addOrderBy('inventory.createdAt', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    const ids = idRows.map((row) => row.id).filter(Boolean);
    const result =
      ids.length > 0
        ? await this.inventoryRepository
            .createQueryBuilder('inventory')
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
            .andWhere('inventory.id IN (:...ids)', { ids })
            .getRawAndEntities()
        : { entities: [], raw: [] };
    const rawById = new Map(result.raw.map((raw: any) => [raw.inventory_id, raw]));
    const entityById = new Map(result.entities.map((entity: any) => [entity.id, entity]));
    const orderedEntities = ids
      .map((id) => entityById.get(id))
      .filter(Boolean);

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
    const list = orderedEntities.map((entity: any) => {
      const raw = rawById.get(entity.id) || {};
      const numQuantity = Number(entity.quantity);
      const lockedQuantity = Number(entity.lockedQuantity || 0);
      const availableQuantity = Math.max(numQuantity - lockedQuantity, 0);
      const safetyStock = raw.safetyStock ? Number(raw.safetyStock) : 0;
      const alertLevel = calculateAlertLevel(availableQuantity, safetyStock);
      const alertInfo = AlertLevelInfo[alertLevel];

      return {
        ...entity,
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        quantity: Math.round(numQuantity * 100) / 100 === Math.floor(numQuantity) ? Math.floor(numQuantity) : Math.round(numQuantity * 100) / 100,
        unitName: raw.unitName,
        unitCode: raw.unitCode,
        unitSymbol: raw.unitSymbol,
        // quantity 带单位显示（整数不显示小数位）
        quantityDisplay: raw.unitSymbol ? `${formatNumber(numQuantity)} ${raw.unitSymbol}` : formatNumber(numQuantity),
        lockedQuantity: Math.round(lockedQuantity * 100) / 100 === Math.floor(lockedQuantity) ? Math.floor(lockedQuantity) : Math.round(lockedQuantity * 100) / 100,
        lockedQuantityDisplay: raw.unitSymbol ? `${formatNumber(lockedQuantity)} ${raw.unitSymbol}` : formatNumber(lockedQuantity),
        availableQuantity: Math.round(availableQuantity * 100) / 100 === Math.floor(availableQuantity) ? Math.floor(availableQuantity) : Math.round(availableQuantity * 100) / 100,
        availableQuantityDisplay: raw.unitSymbol ? `${formatNumber(availableQuantity)} ${raw.unitSymbol}` : formatNumber(availableQuantity),
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
   * 将 Unit 实体转换为 Unit 接口
   */
  private toUnit(unit: any): InventoryUnitResult {
    return {
      id: unit.id,
      code: unit.code,
      name: unit.name,
      category: unit.category,
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
      if (dto.quantity === 0) {
        throw new BadRequestException('调整数量不能为 0');
      }

      // 1. 验证产品并获取产品信息
      const product = await this.getProductBySku(dto.sku, tenantId);

      const inventoryUnit = this.getProductInventoryUnit(product);
      this.ensureRequestUnitMatchesProductUnit(dto.unitCode, inventoryUnit, '调整');
      if (inventoryUnit.isActive !== 1) {
        throw new BadRequestException('单位未启用');
      }

      // 2. 查找或创建库存记录
      let inventory = await queryRunner.manager.findOne(Inventory, {
        where: { sku: dto.sku, tenantId },
      });

      const beforeQty = inventory ? Number(inventory.quantity) : 0;
      const lockedQty = inventory ? Number(inventory.lockedQuantity || 0) : 0;

      // 3. 判断调整类型并计算调整后的数量
      const adjustType =
        dto.quantity >= 0
          ? TransactionType.ADJUSTMENT_IN
          : TransactionType.ADJUSTMENT_OUT;
      const absQuantity = Math.abs(dto.quantity);
      const adjustedQty = absQuantity;

      if (inventory) {
        if (inventory.unitId && inventory.unitId !== inventoryUnit.id) {
          throw new BadRequestException('库存单位与产品库存主单位不一致，请先同步库存单位');
        }

        // 如果是减少库存，检查是否充足
        if (adjustType === TransactionType.ADJUSTMENT_OUT && beforeQty < adjustedQty) {
          throw new BadRequestException(
            `库存不足: 当前${beforeQty}${inventoryUnit.symbol}, 需要调整${adjustedQty}${inventoryUnit.symbol}`,
          );
        }
        if (adjustType === TransactionType.ADJUSTMENT_OUT && beforeQty - adjustedQty < lockedQty) {
          throw new BadRequestException(
            `存在锁定库存，不能将总库存调整到锁定数量以下: 当前锁定${lockedQty}${inventoryUnit.symbol}`,
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
            unitId: inventoryUnit.id,
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
        inventory = queryRunner.manager.create(Inventory, {
          sku: dto.sku,
          productName: product.name,
          quantity: adjustedQty,
          unitId: inventoryUnit.id,
          locationId: dto.locationId,
          tenantId,
        });
        inventory = await queryRunner.manager.save(inventory);
      }

      await this.changeLocationStock(queryRunner, {
        tenantId,
        sku: dto.sku,
        productName: product.name,
        locationId: dto.locationId || inventory!.locationId,
        unitId: inventoryUnit.id,
        quantityDelta:
          adjustType === TransactionType.ADJUSTMENT_IN
            ? adjustedQty
            : -adjustedQty,
      });

      const afterQty = Number(inventory!.quantity);

      // 6. 创建交易记录
      const transaction = queryRunner.manager.create(InventoryTransaction, {
        sku: dto.sku,
        productName: product.name,
        transactionType: adjustType,
        quantity: adjustType === TransactionType.ADJUSTMENT_IN ? absQuantity : -absQuantity,
        unitId: inventoryUnit.id,
        beforeQty,
        afterQty,
        orderNo: null,
        locationId: dto.locationId || inventory?.locationId,
        remark: `${dto.reason}${dto.remark ? ': ' + dto.remark : ''}`,
        tenantId,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      const unitObj = this.toUnit(inventoryUnit);

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

      // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
      const normalizedBeforeQty = Math.round(beforeQty * 100) / 100 === Math.floor(beforeQty) ? Math.floor(beforeQty) : Math.round(beforeQty * 100) / 100;
      const normalizedAfterQty = Math.round(afterQty * 100) / 100 === Math.floor(afterQty) ? Math.floor(afterQty) : Math.round(afterQty * 100) / 100;
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
