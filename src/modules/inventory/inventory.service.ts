import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
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
import { PtlService } from '../ptl/ptl.service';
import * as ExcelJS from 'exceljs';
// 数字格式化 / 数量规范化纯函数已抽到 common/utils，供本 service 各处复用
import { formatNumber, normalizeQuantity } from '../../common/utils/number-format.util';

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
    private ptlService: PtlService,
  ) {}

  /** 库存变化后异步刷新该 SKU 相关货位的 PTL 常驻底色（fire-and-forget，失败不影响库存主流程） */
  private notifyPtlStockChange(tenantId: string, sku: string, locationId?: string) {
    setImmediate(() => {
      this.ptlService
        .refreshBaseColorsForStockChange(tenantId, sku, locationId)
        .catch((e) => console.error('PTL 底色刷新失败:', e?.message || e));
    });
  }

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
    // SKU 库存健康（全仓总量 vs 安全库存）：green 正常 / yellow 告急 / red 归零
    stockStatus: 'green' | 'yellow' | 'red';
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

    // 复用 PTL 同一套规则算该 SKU 的库存健康色（与货位灯底色、大屏一致）
    const stockColorMap = await this.ptlService.getSkuStockColors(tenantId, [options.sku]);
    const stockStatus = stockColorMap.get(options.sku) || 'green';

    return {
      sku: options.sku,
      productName: rows[0]?.productName || '',
      unitId: rows[0]?.unitId,
      unitName: rows[0]?.unitName,
      unitSymbol: rows[0]?.unitSymbol,
      ...totals,
      stockStatus,
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
        quantity: normalizeQuantity(numQuantity),
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
        lockedQuantity: normalizeQuantity(lockedQuantity),
        lockedQuantityDisplay: raw.unitSymbol
          ? `${formatNumber(lockedQuantity)} ${raw.unitSymbol}`
          : `${formatNumber(lockedQuantity)}`,
        availableQuantity: normalizeQuantity(availableQuantity),
        availableQuantityDisplay: raw.unitSymbol
          ? `${formatNumber(availableQuantity)} ${raw.unitSymbol}`
          : `${formatNumber(availableQuantity)}`,
        // 安全库存
        safetyStock: normalizeQuantity(safetyStock),
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

      // 2. 查找或创建库存记录（加行锁，与出库对称，避免并发入库读改写丢更新）
      let inventory = await queryRunner.manager.findOne(Inventory, {
        where: { sku: dto.sku, tenantId },
        lock: { mode: 'pessimistic_write' },
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

      // 入库后刷新该货位 PTL 底色
      this.notifyPtlStockChange(tenantId, dto.sku, dto.locationId || inventory!.locationId);

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
      const normalizedBeforeQty = normalizeQuantity(beforeQty);
      const normalizedAfterQty = normalizeQuantity(afterQty);

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

      // 出库后刷新该货位 PTL 底色
      this.notifyPtlStockChange(tenantId, dto.sku, locationId);

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
            // 出库后库存下降，检查是否跌破安全库存并推送预警（口径=可用库存）
            await this.checkAndSendStockWarning(tenantId, dto.sku, dto.notifyUserIds!);
          } catch (error) {
            console.error('发送库存变更/预警通知失败:', error);
          }
        });
      }

      // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
      const normalizedBeforeQty = normalizeQuantity(beforeQty);
      const normalizedAfterQty = normalizeQuantity(afterQty);

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
   * 构建库存流水列表查询的公共基座。
   *
   * getTransactionsPage / getInboundTransactionsPage / getOutboundTransactionsPage
   * 三个方法的 join、select、租户过滤完全一致，统一在此构建；
   * 各调用方只需在返回的 QueryBuilder 上追加自己的过滤条件与分页。
   *
   * @param tenantId 租户ID
   * @returns 已应用 join / select / 租户 where 的 QueryBuilder
   */
  private buildTransactionListQuery(
    tenantId: string,
  ): SelectQueryBuilder<InventoryTransaction> {
    return this.transactionRepository
      .createQueryBuilder('transaction')
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
  }

  /**
   * 把单条库存流水（entity + 关联 raw）格式化为列表返回项。
   *
   * 三个流水分页方法的行映射逻辑完全一致，统一抽到这里：
   * 数量取绝对值并规范化、计算类型名称与出入库方向、拼接带单位的展示字段。
   *
   * @param entity 流水实体（getRawAndEntities 的 entities 项）
   * @param raw    同一行的原始 join 数据（getRawAndEntities 的 raw 项）
   * @returns 含展示字段的列表项
   */
  private formatTransactionListItem(entity: any, raw: any) {
    const quantity = Math.abs(Number(entity.quantity));
    const beforeQty = Number(entity.beforeQty);
    const afterQty = Number(entity.afterQty);

    // 操作单位（用户录入时所选单位，如 个/kg/箱）符号
    const operationUnitSymbol = raw.unitSymbol;
    // 库存前后数量用的产品库存主单位（如 支/箱）符号，缺失时回退到操作单位
    const stockQtyUnitSymbol = raw.inventoryUnitSymbol || raw.unitSymbol;

    // 操作单位与库存主单位是否不同（仅入库可换算单位时会出现，如「12 个」记入「24 支」）
    const unitsDiffer =
      !!entity.unitId && !!raw.inventoryUnitId && entity.unitId !== raw.inventoryUnitId;
    // 本次变动折算到库存主单位后的数量（= |变动后 - 变动前|），用于让两列单位能对上账
    const stockQuantity = normalizeQuantity(Math.abs(afterQty - beforeQty));

    // 获取类型显示信息
    const transactionType = entity.transactionType as TransactionType;
    const typeDisplayName = TransactionTypeNames[transactionType] || transactionType;
    const typeDirection = this.getTransactionDirection(transactionType);

    // 数量展示（操作单位）：如「12 个」
    const quantityDisplay = operationUnitSymbol
      ? `${formatNumber(quantity)} ${operationUnitSymbol}`
      : formatNumber(quantity);
    // 折算量展示（库存主单位）：如「12 支」
    const stockQuantityDisplay = stockQtyUnitSymbol
      ? `${formatNumber(stockQuantity)} ${stockQtyUnitSymbol}`
      : formatNumber(stockQuantity);
    // 变动前 / 变动后展示（库存主单位）
    const beforeQtyDisplay = stockQtyUnitSymbol
      ? `${formatNumber(beforeQty)} ${stockQtyUnitSymbol}`
      : formatNumber(beforeQty);
    const afterQtyDisplay = stockQtyUnitSymbol
      ? `${formatNumber(afterQty)} ${stockQtyUnitSymbol}`
      : formatNumber(afterQty);

    return {
      ...entity,
      // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
      quantity: normalizeQuantity(quantity),
      beforeQty: normalizeQuantity(beforeQty),
      afterQty: normalizeQuantity(afterQty),
      unitName: raw.unitName,
      unitCode: raw.unitCode,
      unitSymbol: raw.unitSymbol,
      // 折算到库存主单位的本次变动量（数字 + 符号），便于前端自行拼接
      stockQuantity,
      stockUnitSymbol: stockQtyUnitSymbol,
      // 库位信息
      locationName: raw.locationName,
      locationCode: raw.locationCode,
      // 类型显示信息
      typeName: typeDisplayName,
      typeDirection, // INBOUND/OUTBOUND/OTHER
      // 格式化显示字段（旧字段保持不变，兼容其它流水页）
      quantityDisplay,
      beforeQtyDisplay,
      afterQtyDisplay,
      // 折算量展示（库存主单位）：如「12 支」
      stockQuantityDisplay,
      // 入库数量带折算展示：操作单位与库存单位不同时补括号，如「12 个 (12 支)」；相同则只显示「12 个」
      quantityWithStockDisplay: unitsDiffer
        ? `${quantityDisplay} (${stockQuantityDisplay})`
        : quantityDisplay,
      // 库存变化展示（变动前 → 变动后，统一库存主单位）：如「12 支 → 24 支」
      stockChangeDisplay: `${beforeQtyDisplay} → ${afterQtyDisplay}`,
    };
  }

  /**
   * 给流水查询追加「库存流水」页的筛选条件：
   * 精确交易类型 / SKU / 单据号模糊 / 创建时间范围。
   * 列表（getTransactionsPage）与导出（exportTransactions）共用，保证两者口径完全一致。
   *
   * @param queryBuilder 已应用基座的流水 QueryBuilder
   * @param filters 各项筛选条件（均可选）
   */
  private applyTransactionListFilters(
    queryBuilder: SelectQueryBuilder<InventoryTransaction>,
    filters: {
      sku?: string;
      type?: string;
      orderNo?: string;
      startDate?: string;
      endDate?: string;
    },
  ): SelectQueryBuilder<InventoryTransaction> {
    const { sku, type, orderNo, startDate, endDate } = filters;

    if (sku) {
      queryBuilder.andWhere('transaction.sku = :sku', { sku });
    }
    if (type) {
      queryBuilder.andWhere('transaction.transactionType = :type', { type });
    }
    if (orderNo) {
      queryBuilder.andWhere('transaction.orderNo LIKE :orderNo', { orderNo: `%${orderNo}%` });
    }
    if (startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
    }

    return queryBuilder;
  }

  /**
   * 把日期格式化为 `YYYY-MM-DD HH:mm:ss`（导出 Excel 用，避免引入额外日期库）
   */
  private formatDateTime(value: Date | string | null | undefined): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /**
   * 导出库存流水为 Excel，返回文件 Buffer。
   *
   * 复用与列表页完全相同的查询基座与筛选条件（不分页，导出全部命中记录），
   * 列与「库存流水」表格保持一致：变动数量带折算、变动前/后用库存主单位。
   *
   * @param tenantId 租户ID
   * @param options 与列表页一致的筛选条件
   * @returns xlsx 文件 Buffer
   */
  async exportTransactions(
    tenantId: string,
    options: {
      sku?: string;
      type?: string;
      orderNo?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<Buffer> {
    const { sku, type, orderNo, startDate, endDate } = options;

    // 与列表同一套查询基座 + 筛选，保证「导出的就是看到的」；不加分页，导出全部
    const queryBuilder = this.buildTransactionListQuery(tenantId);
    this.applyTransactionListFilters(queryBuilder, { sku, type, orderNo, startDate, endDate });
    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const result = await queryBuilder.getRawAndEntities();
    const rows = result.entities.map((entity, index) =>
      this.formatTransactionListItem(entity, result.raw[index]),
    );

    // 构建工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('库存流水');

    // 表头（与页面列保持一致）
    worksheet.columns = [
      { header: '交易类型', key: 'typeName', width: 14 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: '产品名称', key: 'productName', width: 24 },
      { header: '变动数量', key: 'quantity', width: 18 },
      { header: '变动前', key: 'beforeQty', width: 14 },
      { header: '变动后', key: 'afterQty', width: 14 },
      { header: '单据号', key: 'orderNo', width: 18 },
      { header: '库位', key: 'locationName', width: 18 },
      { header: '备注', key: 'remark', width: 24 },
      { header: '变动时间', key: 'createdAt', width: 20 },
    ];
    // 表头加粗
    worksheet.getRow(1).font = { bold: true };

    for (const row of rows as any[]) {
      // 变动数量带方向符号（入库 +，出库 -，其它不加），文本与页面一致并补折算量
      const sign =
        row.typeDirection === 'INBOUND' ? '+' : row.typeDirection === 'OUTBOUND' ? '-' : '';
      worksheet.addRow({
        typeName: row.typeName,
        sku: row.sku,
        productName: row.productName,
        quantity: `${sign}${row.quantityWithStockDisplay || row.quantityDisplay || ''}`,
        beforeQty: row.beforeQtyDisplay,
        afterQty: row.afterQtyDisplay,
        orderNo: row.orderNo || '',
        locationName: row.locationName || '',
        remark: row.remark || '',
        createdAt: this.formatDateTime(row.createdAt),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
      orderNo?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, sku, type, orderNo, startDate, endDate } = options;

    // 复用流水查询基座 + 通用流水筛选（与导出口径一致）
    const queryBuilder = this.buildTransactionListQuery(tenantId);
    this.applyTransactionListFilters(queryBuilder, { sku, type, orderNo, startDate, endDate });

    // 流水按时间倒序：最新记录排在最前
    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const result = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();

    // 获取总数
    const total = await queryBuilder.getCount();

    // 合并数据和单位信息，并添加格式化显示字段（复用统一的行映射）
    const list = result.entities.map((entity, index) =>
      this.formatTransactionListItem(entity, result.raw[index]),
    );

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
      orderNo?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, sku, transactionType, orderNo, startDate, endDate } = options;

    // 复用流水查询基座，再追加入库特有的过滤条件
    const queryBuilder = this.buildTransactionListQuery(tenantId);

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

    if (orderNo) {
      queryBuilder.andWhere('transaction.orderNo LIKE :orderNo', { orderNo: `%${orderNo}%` });
    }

    if (startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
    }

    // 流水按时间倒序：最新的入库记录排在最前
    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const result = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();

    // 获取总数
    const total = await queryBuilder.getCount();

    // 合并数据和单位信息，并添加格式化显示字段（复用统一的行映射）
    const list = result.entities.map((entity, index) =>
      this.formatTransactionListItem(entity, result.raw[index]),
    );

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
      orderNo?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, sku, transactionType, orderNo, startDate, endDate } = options;

    // 复用流水查询基座，再追加出库特有的过滤条件
    const queryBuilder = this.buildTransactionListQuery(tenantId);

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

    if (orderNo) {
      queryBuilder.andWhere('transaction.orderNo LIKE :orderNo', { orderNo: `%${orderNo}%` });
    }

    if (startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
    }

    // 流水按时间倒序：最新的出库记录排在最前
    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const result = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getRawAndEntities();

    // 获取总数
    const total = await queryBuilder.getCount();

    // 合并数据和单位信息，并添加格式化显示字段（复用统一的行映射）
    const list = result.entities.map((entity, index) =>
      this.formatTransactionListItem(entity, result.raw[index]),
    );

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
      .addOrderBy('inventory.createdAt', 'ASC')
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

    // 预警级别统一用共享方法 calculateAlertLevel（与预警推送口径一致）

    // 格式化返回数据
    const list = orderedEntities.map((entity: any) => {
      const raw = rawById.get(entity.id) || {};
      const numQuantity = Number(entity.quantity);
      const lockedQuantity = Number(entity.lockedQuantity || 0);
      const availableQuantity = Math.max(numQuantity - lockedQuantity, 0);
      const safetyStock = raw.safetyStock ? Number(raw.safetyStock) : 0;
      const alertLevel = this.calculateAlertLevel(availableQuantity, safetyStock);
      const alertInfo = AlertLevelInfo[alertLevel];

      return {
        ...entity,
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        quantity: normalizeQuantity(numQuantity),
        unitName: raw.unitName,
        unitCode: raw.unitCode,
        unitSymbol: raw.unitSymbol,
        // quantity 带单位显示（整数不显示小数位）
        quantityDisplay: raw.unitSymbol ? `${formatNumber(numQuantity)} ${raw.unitSymbol}` : formatNumber(numQuantity),
        lockedQuantity: normalizeQuantity(lockedQuantity),
        lockedQuantityDisplay: raw.unitSymbol ? `${formatNumber(lockedQuantity)} ${raw.unitSymbol}` : formatNumber(lockedQuantity),
        availableQuantity: normalizeQuantity(availableQuantity),
        availableQuantityDisplay: raw.unitSymbol ? `${formatNumber(availableQuantity)} ${raw.unitSymbol}` : formatNumber(availableQuantity),
        // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
        safetyStock: normalizeQuantity(safetyStock),
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

      // 2. 查找或创建库存记录（加行锁，避免并发调整读改写丢更新）
      let inventory = await queryRunner.manager.findOne(Inventory, {
        where: { sku: dto.sku, tenantId },
        lock: { mode: 'pessimistic_write' },
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

      // 调整后刷新该货位 PTL 底色
      this.notifyPtlStockChange(tenantId, dto.sku, dto.locationId || inventory?.locationId);

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
            // 仅盘亏（库存下降）后检查是否跌破安全库存并推送预警；盘盈不查
            if (adjustType === TransactionType.ADJUSTMENT_OUT) {
              await this.checkAndSendStockWarning(tenantId, dto.sku, dto.notifyUserIds!);
            }
          } catch (error) {
            console.error('发送库存变更/预警通知失败:', error);
          }
        });
      }

      // 将 decimal 类型转换为数字类型（整数返回整数，小数返回小数）
      const normalizedBeforeQty = normalizeQuantity(beforeQty);
      const normalizedAfterQty = normalizeQuantity(afterQty);
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
  /**
   * 计算库存预警级别（可用库存 vs 安全库存）。
   * 预警列表（getAlerts）与预警推送共用，保证两处口径一致。
   *
   * - 可用库存 <= 0：严重（CRITICAL）
   * - 未设置安全库存：中（MEDIUM）
   * - 可用 < 安全库存 * 20%：高（HIGH）
   * - 其余（已低于安全库存）：中（MEDIUM）
   *
   * @param availableQty 可用库存（quantity - locked）
   * @param safetyStock 安全库存
   */
  private calculateAlertLevel(availableQty: number, safetyStock: number | null): AlertLevel {
    const safetyStockNum = safetyStock ? Number(safetyStock) : 0;

    if (availableQty <= 0) {
      return AlertLevel.CRITICAL;
    }
    if (safetyStockNum === 0) {
      return AlertLevel.MEDIUM;
    }
    if (availableQty < safetyStockNum * 0.2) {
      return AlertLevel.HIGH;
    }
    if (availableQty < safetyStockNum * 0.5) {
      return AlertLevel.MEDIUM;
    }
    return AlertLevel.MEDIUM;
  }

  /** 预警级别 -> 通知优先级映射（推送预警用） */
  private alertLevelToPriority(level: AlertLevel): NotificationPriority {
    if (level === AlertLevel.CRITICAL) return NotificationPriority.URGENT;
    if (level === AlertLevel.HIGH) return NotificationPriority.HIGH;
    return NotificationPriority.NORMAL;
  }

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

    // 预警级别与优先级统一走共享口径
    const alertLevel = this.calculateAlertLevel(currentQty, safetyStock);
    const priority = this.alertLevelToPriority(alertLevel);

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
   * 在库存下降（出库 / 盘亏）后调用：以「可用库存」(quantity - locked) 为口径，
   * 与预警列表 getAlerts 保持一致，低于安全库存则推送预警。
   *
   * @param tenantId 租户ID
   * @param sku 产品SKU
   * @param userIds 接收通知的用户ID列表
   */
  private async checkAndSendStockWarning(
    tenantId: string,
    sku: string,
    userIds: string[],
  ): Promise<void> {
    // 无接收人直接跳过，避免无谓查询
    if (!userIds || userIds.length === 0) {
      return;
    }

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
    // 口径与预警列表一致：用可用库存（总量 - 锁定）判断，而非总库存
    const availableQty = Number(inventory.quantity) - Number(inventory.lockedQuantity || 0);

    // 只有可用库存低于安全库存时才发送预警
    if (availableQty < safetyStock) {
      await this.sendStockWarningNotification(
        tenantId,
        sku,
        inventory.productName,
        availableQty,
        safetyStock,
        inventory.unit?.symbol || '',
        userIds,
      );
    }
  }
}
