import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { BusinessException } from '@/common/filters/business.exception';
import { Order, OrderSource, OrderStatus, OrderType } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderFlowLog } from './entities/order-flow-log.entity';
import { Product } from '../product/product.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryLocation } from '../location/entities/inventory-location.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';
import { MiniappMember } from '../miniapp/entities/miniapp-member.entity';
import { TransactionType } from '@/common/constants/unit.constant';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateMiniappOrderDto } from './dto/create-miniapp-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderFlowLog)
    private readonly flowLogRepository: Repository<OrderFlowLog>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(MiniappMember)
    private readonly miniappMemberRepository: Repository<MiniappMember>,
    private readonly dataSource: DataSource,
  ) {}

  private generateOrderNumber() {
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${stamp}-${random}`;
  }

  private getInitialStatus(orderType: OrderType, status?: OrderStatus) {
    if (status) return status;
    return orderType === OrderType.CUSTOM ? OrderStatus.PENDING_REVIEW : OrderStatus.PENDING_CONFIRM;
  }

  private getTransitionMap(orderType: OrderType): Record<OrderStatus, OrderStatus[]> {
    const commonTerminal = {
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REJECTED]: [],
    };

    if (orderType === OrderType.CUSTOM) {
      return {
        [OrderStatus.PENDING_CONFIRM]: [OrderStatus.PENDING_REVIEW, OrderStatus.REJECTED, OrderStatus.CANCELLED],
        [OrderStatus.PENDING_REVIEW]: [OrderStatus.PENDING_SCHEDULE, OrderStatus.REJECTED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.PENDING_SCHEDULE, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        [OrderStatus.STOCK_LOCKED]: [OrderStatus.PENDING_SHIPMENT, OrderStatus.CANCELLED],
        [OrderStatus.OUT_OF_STOCK]: [OrderStatus.PENDING_SCHEDULE, OrderStatus.CANCELLED],
        [OrderStatus.PENDING_SCHEDULE]: [OrderStatus.SCHEDULED, OrderStatus.CANCELLED],
        [OrderStatus.SCHEDULED]: [OrderStatus.PRODUCING, OrderStatus.CANCELLED],
        [OrderStatus.PRODUCING]: [OrderStatus.PRODUCED, OrderStatus.CANCELLED],
        [OrderStatus.PRODUCED]: [OrderStatus.PENDING_SHIPMENT, OrderStatus.CANCELLED],
        [OrderStatus.PENDING_SHIPMENT]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
        ...commonTerminal,
      };
    }

    return {
        [OrderStatus.PENDING_CONFIRM]: [
          OrderStatus.CONFIRMED,
          OrderStatus.REJECTED,
          OrderStatus.OUT_OF_STOCK,
          OrderStatus.CANCELLED,
        ],
      [OrderStatus.PENDING_REVIEW]: [OrderStatus.CONFIRMED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,
        OrderStatus.STOCK_LOCKED,
        OrderStatus.PENDING_SHIPMENT,
        OrderStatus.OUT_OF_STOCK,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PROCESSING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.STOCK_LOCKED]: [OrderStatus.PENDING_SHIPMENT, OrderStatus.CANCELLED],
      [OrderStatus.OUT_OF_STOCK]: [OrderStatus.PENDING_SCHEDULE, OrderStatus.CANCELLED],
      [OrderStatus.PENDING_SCHEDULE]: [OrderStatus.SCHEDULED, OrderStatus.CANCELLED],
      [OrderStatus.SCHEDULED]: [OrderStatus.PRODUCING, OrderStatus.CANCELLED],
      [OrderStatus.PRODUCING]: [OrderStatus.PRODUCED, OrderStatus.CANCELLED],
      [OrderStatus.PRODUCED]: [OrderStatus.PENDING_SHIPMENT, OrderStatus.CANCELLED],
      [OrderStatus.PENDING_SHIPMENT]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
      ...commonTerminal,
    };
  }

  private applyStatusTime(order: Order, status: OrderStatus, dto?: UpdateOrderStatusDto) {
    if (status === OrderStatus.SCHEDULED) {
      order.scheduledStartDate = dto?.scheduledStartDate ? new Date(dto.scheduledStartDate) : order.scheduledStartDate;
      order.scheduledEndDate = dto?.scheduledEndDate ? new Date(dto.scheduledEndDate) : order.scheduledEndDate;
    }
    if (status === OrderStatus.PRODUCED) order.producedAt = new Date();
    if (status === OrderStatus.SHIPPED) order.shippedAt = new Date();
    if (status === OrderStatus.COMPLETED) order.completedAt = new Date();
    if (status === OrderStatus.CANCELLED) order.cancelledAt = new Date();
  }

  private async createInventoryTransaction(
    manager: any,
    params: {
      tenantId: string;
      sku: string;
      productName: string;
      transactionType: TransactionType;
      quantity: number;
      unitId?: string | null;
      beforeQty: number;
      afterQty: number;
      orderNo: string;
      locationId?: string | null;
      remark?: string | null;
    },
  ) {
    await manager.save(
      manager.create(InventoryTransaction, {
        tenantId: params.tenantId,
        sku: params.sku,
        productName: params.productName,
        transactionType: params.transactionType,
        quantity: params.quantity,
        unitId: params.unitId || null,
        beforeQty: params.beforeQty,
        afterQty: params.afterQty,
        orderNo: params.orderNo,
        locationId: params.locationId || null,
        remark: params.remark || null,
      }),
    );
  }

  private async updateLocationLockedQuantity(
    manager: any,
    inventory: Inventory,
    delta: number,
  ): Promise<string | null> {
    if (delta === 0) return inventory.locationId || null;
    const locationStocks = await manager.find(InventoryLocation, {
      where: {
        tenantId: inventory.tenantId,
        sku: inventory.sku,
      },
      lock: { mode: 'pessimistic_write' },
      order: { updatedAt: 'ASC' },
    });
    if (locationStocks.length === 0) {
      throw new BusinessException(`SKU ${inventory.sku} 的库位库存记录不存在`);
    }

    const firstLocationId = locationStocks[0]?.locationId || inventory.locationId || null;

    if (delta > 0) {
      const totalAvailable = locationStocks.reduce(
        (sum, stock) => sum + Math.max(Number(stock.quantity || 0) - Number(stock.lockedQuantity || 0), 0),
        0,
      );
      if (totalAvailable < delta) {
        throw new BusinessException(`SKU ${inventory.sku} 库位可用库存不足，无法锁定`);
      }

      let remaining = delta;
      for (const stock of locationStocks) {
        if (remaining <= 0) break;
        const quantity = Number(stock.quantity || 0);
        const lockedQty = Number(stock.lockedQuantity || 0);
        const available = Math.max(quantity - lockedQty, 0);
        if (available <= 0) continue;
        const lockQty = Math.min(available, remaining);
        await manager.update(
          InventoryLocation,
          { id: stock.id },
          { lockedQuantity: lockedQty + lockQty },
        );
        remaining -= lockQty;
      }
      return firstLocationId;
    }

    const releaseQuantity = Math.abs(delta);
    const totalLocked = locationStocks.reduce(
      (sum, stock) => sum + Number(stock.lockedQuantity || 0),
      0,
    );
    if (totalLocked < releaseQuantity) {
      throw new BusinessException(`SKU ${inventory.sku} 库位锁定库存不足，无法释放`);
    }

    let remaining = releaseQuantity;
    for (const stock of locationStocks) {
      if (remaining <= 0) break;
      const lockedQty = Number(stock.lockedQuantity || 0);
      if (lockedQty <= 0) continue;
      const releaseQty = Math.min(lockedQty, remaining);
      await manager.update(
        InventoryLocation,
        { id: stock.id },
        { lockedQuantity: lockedQty - releaseQty },
      );
      remaining -= releaseQty;
    }
    return firstLocationId;
  }

  private async deductLocationStock(
    manager: any,
    inventory: Inventory,
    quantity: number,
  ): Promise<string | null> {
    if (quantity === 0) return inventory.locationId || null;
    const locationStocks = await manager.find(InventoryLocation, {
      where: {
        tenantId: inventory.tenantId,
        sku: inventory.sku,
      },
      lock: { mode: 'pessimistic_write' },
      order: { updatedAt: 'ASC' },
    });
    if (locationStocks.length === 0) {
      throw new BusinessException(`SKU ${inventory.sku} 的库位库存记录不存在`);
    }

    const totalLocked = locationStocks.reduce((sum, stock) => sum + Number(stock.lockedQuantity || 0), 0);
    const totalStock = locationStocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0);
    if (totalLocked < quantity) {
      throw new BusinessException(`SKU ${inventory.sku} 库位锁定库存不足，无法完成`);
    }
    if (totalStock < quantity) {
      throw new BusinessException(`SKU ${inventory.sku} 库位库存不足，无法扣减`);
    }

    const firstLocationId = locationStocks[0]?.locationId || inventory.locationId || null;
    let remaining = quantity;
    for (const stock of locationStocks) {
      if (remaining <= 0) break;
      const stockQty = Number(stock.quantity || 0);
      const lockedQty = Number(stock.lockedQuantity || 0);
      if (lockedQty <= 0) continue;
      const deductQty = Math.min(lockedQty, remaining);
      await manager.update(
        InventoryLocation,
        { id: stock.id },
        {
          quantity: stockQty - deductQty,
          lockedQuantity: lockedQty - deductQty,
        },
      );
      remaining -= deductQty;
    }
    return firstLocationId;
  }

  private async normalizeOrderItem(
    manager: any,
    tenantId: string,
    item: CreateOrderDto['items'][number],
  ) {
    if (!item.sku && !item.productId) return item;

    const where = item.productId
      ? { id: item.productId, tenantId }
      : { code: item.sku, tenantId };
    const product = await manager.findOne(Product, {
      where,
      relations: ['inventoryUnit'],
    });
    if (!product) {
      throw new BusinessException(`订单明细产品不存在：${item.sku || item.productId}`);
    }
    if (product.isActive !== 1) {
      throw new BusinessException(`产品 ${product.name} 已禁用，不能下单`);
    }
    if (!product.unitId || !product.inventoryUnit) {
      throw new BusinessException(`产品 ${product.name} 未维护库存主单位，不能下单`);
    }
    if (item.unitCode && item.unitCode !== product.inventoryUnit.code) {
      throw new BusinessException(
        `产品 ${product.name} 下单单位必须使用库存主单位：${product.inventoryUnit.name}(${product.inventoryUnit.code})`,
      );
    }

    return {
      ...item,
      productId: product.id,
      sku: product.code,
      productName: item.productName || product.name,
      unitCode: product.inventoryUnit.code,
      unitName: product.inventoryUnit.symbol || product.inventoryUnit.name || product.inventoryUnit.code,
      specs: product.specs || null,
    };
  }

  private async getSkuOrderUnit(tenantId: string, product: Product) {
    const productUnit = product.inventoryUnit;
    if (!product.unitId || !productUnit) {
      throw new BusinessException('产品库存主单位未维护，暂不能订购');
    }

    const row = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .where('inventory.tenantId = :tenantId', { tenantId })
      .andWhere('inventory.sku = :sku', { sku: product.code })
      .select('COUNT(inventory.id)', 'stockRows')
      .addSelect('COUNT(DISTINCT inventory.unitId)', 'unitCount')
      .addSelect('MIN(inventory.unitId)', 'unitId')
      .addSelect('COALESCE(SUM(inventory.quantity - COALESCE(inventory.lockedQuantity, 0)), 0)', 'availableQuantity')
      .getRawOne<{
        stockRows: string;
        unitCount: string;
        unitId: string | null;
        availableQuantity: string;
      }>();

    if (!row || Number(row.stockRows || 0) === 0) {
      throw new BusinessException(`SKU ${product.code} 的库存记录不存在`);
    }
    if (!row.unitId) {
      throw new BusinessException('库存单位未维护，暂不能订购');
    }
    if (Number(row.unitCount || 0) > 1) {
      throw new BusinessException('该产品存在多个库存主单位，请先统一库存单位后再订购');
    }
    if (row.unitId !== product.unitId) {
      throw new BusinessException('库存单位与产品库存主单位不一致，请先同步库存单位');
    }

    return {
      unitId: product.unitId,
      unitCode: productUnit.code,
      unitName: productUnit.name || productUnit.symbol || productUnit.code,
      unitSymbol: productUnit.symbol || productUnit.name || productUnit.code,
      availableQuantity: Number(row.availableQuantity || 0),
    };
  }

  private async lockOrderItemsStock(manager: any, order: Order, remark?: string | null) {
    for (const item of order.items || []) {
      if (!item.sku) continue;
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) continue;

      const inventories = await manager.find(Inventory, {
        where: { tenantId: order.tenantId, sku: item.sku },
        lock: { mode: 'pessimistic_write' },
        order: { updatedAt: 'ASC' },
      });
      if (inventories.length === 0) throw new BusinessException(`SKU ${item.sku} 的库存记录不存在`);

      const totalAvailableQty = inventories.reduce(
        (sum, inventory) =>
          sum + Math.max(Number(inventory.quantity || 0) - Number(inventory.lockedQuantity || 0), 0),
        0,
      );
      if (totalAvailableQty < quantity) {
        throw new BusinessException(
          `${item.productName} 库存不足：可订购 ${totalAvailableQty}，需要 ${quantity}`,
        );
      }

      let remaining = quantity;
      for (const inventory of inventories) {
        if (remaining <= 0) break;
        const stockQty = Number(inventory.quantity || 0);
        const lockedQty = Number(inventory.lockedQuantity || 0);
        const availableQty = Math.max(stockQty - lockedQty, 0);
        if (availableQty <= 0) continue;
        const lockQty = Math.min(availableQty, remaining);

        await manager.update(
          Inventory,
          { id: inventory.id },
          { lockedQuantity: lockedQty + lockQty },
        );
        const locationId = await this.updateLocationLockedQuantity(manager, inventory, lockQty);
        await this.createInventoryTransaction(manager, {
          tenantId: order.tenantId,
          sku: item.sku,
          productName: item.productName,
          transactionType: TransactionType.STOCK_LOCK,
          quantity: lockQty,
          unitId: inventory.unitId,
          beforeQty: availableQty,
          afterQty: availableQty - lockQty,
          orderNo: order.orderNumber,
          locationId,
          remark: remark || '订购单锁定库存',
        });
        remaining -= lockQty;
      }
    }
  }

  private async releaseOrderItemsStock(manager: any, order: Order, remark?: string | null) {
    for (const item of order.items || []) {
      if (!item.sku) continue;
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) continue;

      const inventories = await manager.find(Inventory, {
        where: { tenantId: order.tenantId, sku: item.sku },
        lock: { mode: 'pessimistic_write' },
        order: { updatedAt: 'ASC' },
      });
      if (inventories.length === 0) throw new BusinessException(`SKU ${item.sku} 的库存记录不存在`);

      const totalLockedQty = inventories.reduce((sum, inventory) => sum + Number(inventory.lockedQuantity || 0), 0);
      if (totalLockedQty < quantity) {
        throw new BusinessException(`${item.productName} 锁定库存不足，无法释放`);
      }

      let remaining = quantity;
      for (const inventory of inventories) {
        if (remaining <= 0) break;
        const stockQty = Number(inventory.quantity || 0);
        const lockedQty = Number(inventory.lockedQuantity || 0);
        if (lockedQty <= 0) continue;
        const releaseQty = Math.min(lockedQty, remaining);
        const beforeAvailable = stockQty - lockedQty;

        await manager.update(
          Inventory,
          { id: inventory.id },
          { lockedQuantity: lockedQty - releaseQty },
        );
        const locationId = await this.updateLocationLockedQuantity(manager, inventory, -releaseQty);
        await this.createInventoryTransaction(manager, {
          tenantId: order.tenantId,
          sku: item.sku,
          productName: item.productName,
          transactionType: TransactionType.STOCK_RELEASE,
          quantity: releaseQty,
          unitId: inventory.unitId,
          beforeQty: beforeAvailable,
          afterQty: beforeAvailable + releaseQty,
          orderNo: order.orderNumber,
          locationId,
          remark: remark || '订购单释放库存',
        });
        remaining -= releaseQty;
      }
    }
  }

  private async deductOrderItemsStock(manager: any, order: Order, remark?: string | null) {
    for (const item of order.items || []) {
      if (!item.sku) continue;
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) continue;

      const inventories = await manager.find(Inventory, {
        where: { tenantId: order.tenantId, sku: item.sku },
        lock: { mode: 'pessimistic_write' },
        order: { updatedAt: 'ASC' },
      });
      if (inventories.length === 0) throw new BusinessException(`SKU ${item.sku} 的库存记录不存在`);

      const totalLockedQty = inventories.reduce((sum, inventory) => sum + Number(inventory.lockedQuantity || 0), 0);
      const totalStockQty = inventories.reduce((sum, inventory) => sum + Number(inventory.quantity || 0), 0);
      if (totalLockedQty < quantity) throw new BusinessException(`${item.productName} 锁定库存不足，无法完成`);
      if (totalStockQty < quantity) throw new BusinessException(`${item.productName} 库存不足，无法扣减`);

      let remaining = quantity;
      for (const inventory of inventories) {
        if (remaining <= 0) break;
        const stockQty = Number(inventory.quantity || 0);
        const lockedQty = Number(inventory.lockedQuantity || 0);
        if (lockedQty <= 0) continue;
        const deductQty = Math.min(lockedQty, remaining);

        await manager.update(
          Inventory,
          { id: inventory.id },
          {
            quantity: stockQty - deductQty,
            lockedQuantity: lockedQty - deductQty,
          },
        );
        const locationId = await this.deductLocationStock(manager, inventory, deductQty);
        await this.createInventoryTransaction(manager, {
          tenantId: order.tenantId,
          sku: item.sku,
          productName: item.productName,
          transactionType: TransactionType.OUTBOUND_SALES,
          quantity: -deductQty,
          unitId: inventory.unitId,
          beforeQty: stockQty,
          afterQty: stockQty - deductQty,
          orderNo: order.orderNumber,
          locationId,
          remark: remark || '订购单完成扣减库存',
        });
        remaining -= deductQty;
      }
    }
  }

  async create(createOrderDto: CreateOrderDto, tenantId: string): Promise<Order> {
    const orderNumber = createOrderDto.orderNumber || this.generateOrderNumber();
    const exists = await this.orderRepository.findOne({ where: { tenantId, orderNumber } });
    if (exists) throw new BusinessException(`订单号 ${orderNumber} 已存在`);

    return this.dataSource.transaction(async (manager) => {
      const orderType = createOrderDto.orderType || OrderType.STANDARD;
      const status = this.getInitialStatus(orderType, createOrderDto.status);
      const order = manager.create(Order, {
        ...createOrderDto,
        orderNumber,
        tenantId,
        source: createOrderDto.source || OrderSource.ADMIN,
        orderType,
        status,
        totalAmount: createOrderDto.totalAmount || 0,
        expectedDeliveryDate: createOrderDto.expectedDeliveryDate
          ? new Date(createOrderDto.expectedDeliveryDate)
          : null,
      });

      const normalizedItems = [];
      for (const item of createOrderDto.items || []) {
        normalizedItems.push(await this.normalizeOrderItem(manager, tenantId, item));
      }

      const orderItems = normalizedItems.map((item) =>
        manager.create(OrderItem, {
          ...item,
          tenantId,
          amount: Number(item.quantity || 0) * Number(item.price || 0),
          price: item.price || 0,
          unitCode: item.unitCode || null,
          unitName: item.unitName || null,
          sku: item.sku || null,
          productId: item.productId || null,
          customRequirement: item.customRequirement || null,
          drawingUrls: item.drawingUrls || null,
        }),
      );

      const saved = await manager.save(order);
      if (orderItems.length > 0) {
        saved.items = await manager.save(
          OrderItem,
          orderItems.map((item) => ({
            ...item,
            orderId: saved.id,
          })),
        );
      }
      await manager.save(
        manager.create(OrderFlowLog, {
          tenantId,
          orderId: saved.id,
          fromStatus: null,
          toStatus: status,
          action: 'CREATE',
          operatorId: null,
          operatorName: null,
          remark: '创建订单',
        }),
      );
      return manager.findOne(Order, {
        where: { id: saved.id, tenantId },
        relations: ['items'],
        order: { items: { createdAt: 'ASC' } },
      });
    });
  }

  async createMiniappOrder(dto: CreateMiniappOrderDto, memberId: string): Promise<Order> {
    const quantity = Number(dto.quantity || 0);
    if (quantity <= 0) throw new BusinessException('订购数量必须大于 0');

    const member = await this.miniappMemberRepository.findOne({ where: { id: memberId } });
    if (!member || member.isActive !== 1) throw new BusinessException('会员不存在或已禁用');

    const product = await this.productRepository.findOne({
      where: { id: dto.productId, tenantId: dto.tenantId, isActive: 1 },
      relations: ['inventoryUnit'],
    });
    if (!product) throw new BusinessException('产品不存在或已下架');

    const orderUnit = await this.getSkuOrderUnit(dto.tenantId, product);
    if (orderUnit.availableQuantity < quantity) {
      throw new BusinessException(
        `${product.name} 库存不足：可订购 ${orderUnit.availableQuantity}${orderUnit.unitSymbol}，需要 ${quantity}${orderUnit.unitSymbol}`,
      );
    }

    const orderNumber = this.generateOrderNumber();

    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        tenantId: dto.tenantId,
        orderNumber,
        source: OrderSource.MINIAPP,
        orderType: OrderType.STANDARD,
        status: OrderStatus.PENDING_CONFIRM,
        customerName: dto.contactName,
        customerPhone: dto.contactPhone,
        customerEmail: null,
        customerAddress: dto.address || null,
        miniappMemberId: member.id,
        totalAmount: 0,
        remark: dto.remark || null,
        stockLocked: 1, // 小程序下单即锁库（下方 lockOrderItemsStock 在同一事务内执行）
      });

      const orderItems = [
        manager.create(OrderItem, {
          tenantId: dto.tenantId,
          productId: product.id,
          sku: product.code,
          productName: product.name,
          quantity,
          unitCode: orderUnit.unitCode,
          unitName: orderUnit.unitName,
          price: 0,
          amount: 0,
          specs: product.specs || null,
        }),
      ];

      const saved = await manager.save(order);
      saved.items = await manager.save(
        OrderItem,
        orderItems.map((item) => ({
          ...item,
          orderId: saved.id,
        })),
      );
      await this.lockOrderItemsStock(manager, saved, '小程序订购锁定库存');
      await manager.save(
        manager.create(OrderFlowLog, {
          tenantId: dto.tenantId,
          orderId: saved.id,
          fromStatus: null,
          toStatus: OrderStatus.PENDING_CONFIRM,
          action: 'MINIAPP_SUBSCRIBE',
          operatorId: member.id,
          operatorName: member.nickName || dto.contactName,
          remark: '小程序提交订购单',
        }),
      );
      return manager.findOne(Order, {
        where: { id: saved.id, tenantId: dto.tenantId },
        relations: ['items'],
        order: { items: { createdAt: 'ASC' } },
      });
    });
  }

  async findPage(tenantId: string, query: QueryOrderDto) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.tenantId = :tenantId', { tenantId });

    if (query.orderNumber) {
      qb.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${query.orderNumber}%` });
    }
    if (query.status) qb.andWhere('order.status = :status', { status: query.status });
    if (query.orderType) qb.andWhere('order.orderType = :orderType', { orderType: query.orderType });
    if (query.source) qb.andWhere('order.source = :source', { source: query.source });
    if (query.customerKeyword) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('order.customerName LIKE :keyword', { keyword: `%${query.customerKeyword}%` })
            .orWhere('order.customerPhone LIKE :keyword', { keyword: `%${query.customerKeyword}%` })
            .orWhere('order.customerEmail LIKE :keyword', { keyword: `%${query.customerKeyword}%` });
        }),
      );
    }

    const [list, total] = await qb
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async findMiniappOrders(memberId: string, query: { page?: number; pageNo?: number; pageSize?: number; status?: OrderStatus }) {
    const page = Number(query.page || query.pageNo || 1);
    const pageSize = Number(query.pageSize || 10);
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.miniappMemberId = :memberId', { memberId })
      .andWhere('order.source = :source', { source: OrderSource.MINIAPP });

    if (query.status) qb.andWhere('order.status = :status', { status: query.status });

    const [list, total] = await qb
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list,
      total,
      page,
      pageNo: page,
      pageSize,
      hasNext: page * pageSize < total,
    };
  }

  async findMiniappOrderDetail(memberId: string, id: string) {
    const order = await this.orderRepository.findOne({
      where: { id, miniappMemberId: memberId, source: OrderSource.MINIAPP },
      relations: ['items'],
      order: { items: { createdAt: 'ASC' } },
    });
    if (!order) throw new BusinessException('订单不存在');
    return order;
  }

  async cancelMiniappOrder(memberId: string, id: string) {
    const order = await this.orderRepository.findOne({
      where: { id, miniappMemberId: memberId, source: OrderSource.MINIAPP },
      relations: ['items'],
      order: { items: { createdAt: 'ASC' } },
    });
    if (!order) throw new BusinessException('订单不存在');
    if (order.status !== OrderStatus.PENDING_CONFIRM) {
      throw new BusinessException('只有待确认订单可以取消');
    }

    const fromStatus = order.status;
    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();

    return this.dataSource.transaction(async (manager) => {
      if (order.stockLocked === 1) {
        await this.releaseOrderItemsStock(manager, order, '用户取消订购单');
        order.stockLocked = 0;
      }
      const saved = await manager.save(order);
      await manager.save(
        manager.create(OrderFlowLog, {
          tenantId: order.tenantId,
          orderId: order.id,
          fromStatus,
          toStatus: OrderStatus.CANCELLED,
          action: 'MINIAPP_CANCEL',
          operatorId: memberId,
          operatorName: order.customerName,
          remark: '小程序用户取消订单',
        }),
      );
      return manager.findOne(Order, {
        where: { id: saved.id, miniappMemberId: memberId, source: OrderSource.MINIAPP },
        relations: ['items'],
        order: { items: { createdAt: 'ASC' } },
      });
    });
  }

  async findAll(tenantId: string): Promise<Order[]> {
    return this.orderRepository.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, tenantId },
      relations: ['items'],
      order: { items: { createdAt: 'ASC' } },
    });
    if (!order) throw new BusinessException('订单不存在');
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, tenantId: string): Promise<Order> {
    const order = await this.findOne(id, tenantId);
    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED].includes(order.status)) {
      throw new BusinessException('终态订单不可修改');
    }
    const { items, status, ...baseInfo } = updateOrderDto as any;
    await this.orderRepository.update({ id, tenantId }, baseInfo);
    return this.findOne(id, tenantId);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, tenantId: string) {
    const order = await this.findOne(id, tenantId);
    const transitionMap = this.getTransitionMap(order.orderType);
    const nextStatuses = transitionMap[order.status] || [];

    if (!nextStatuses.includes(dto.status)) {
      throw new BusinessException('当前订单状态不允许该流转');
    }
    if (order.source === OrderSource.MINIAPP && dto.status === OrderStatus.OUT_OF_STOCK) {
      throw new BusinessException('小程序订购单已预占库存，不能流转为库存不足');
    }

    const fromStatus = order.status;
    order.status = dto.status;
    if (dto.status === OrderStatus.PENDING_SCHEDULE) {
      order.reviewRemark = dto.remark || order.reviewRemark;
    }
    if (dto.status === OrderStatus.REJECTED) {
      order.rejectReason = dto.remark || order.rejectReason;
    }
    this.applyStatusTime(order, dto.status, dto);

    return this.dataSource.transaction(async (manager) => {
      // 1) 进入「已确认」：admin/website 标准订单在此锁库（小程序单创建时已锁，靠 stockLocked 去重）
      if (
        dto.status === OrderStatus.CONFIRMED &&
        order.source !== OrderSource.MINIAPP &&
        order.stockLocked !== 1
      ) {
        await this.lockOrderItemsStock(manager, order, dto.remark || '订单确认锁定库存');
        order.stockLocked = 1;
      }

      // 2) 取消 / 驳回：释放仍持有的锁定库存（未锁的单跳过，避免误释放）
      if (
        [OrderStatus.CANCELLED, OrderStatus.REJECTED].includes(dto.status) &&
        order.stockLocked === 1
      ) {
        await this.releaseOrderItemsStock(manager, order, dto.remark || null);
        order.stockLocked = 0;
      }

      // 3) 发货 / 完成：锁定库存转为实际出库扣减（只在持锁时执行一次；先到 SHIPPED 则在发货扣，
      //    若走 PROCESSING→COMPLETED 未发货路径则在完成时扣，stockLocked 保证不重复）
      if (
        [OrderStatus.SHIPPED, OrderStatus.COMPLETED].includes(dto.status) &&
        order.stockLocked === 1
      ) {
        await this.deductOrderItemsStock(manager, order, dto.remark || null);
        order.stockLocked = 0;
      }

      const saved = await manager.save(order);
      await manager.save(
        manager.create(OrderFlowLog, {
          tenantId,
          orderId: id,
          fromStatus,
          toStatus: dto.status,
          action: 'STATUS_CHANGE',
          operatorId: null,
          operatorName: null,
          remark: dto.remark || null,
        }),
      );
      return saved;
    });
  }

  async findLogs(orderId: string, tenantId: string) {
    await this.findOne(orderId, tenantId);
    return this.flowLogRepository.find({
      where: { tenantId, orderId },
      order: { createdAt: 'ASC' },
    });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const order = await this.findOne(id, tenantId);
    if (![OrderStatus.PENDING_CONFIRM, OrderStatus.PENDING_REVIEW, OrderStatus.REJECTED, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BusinessException('当前订单状态不可删除');
    }
    await this.orderRepository.delete({ id, tenantId });
  }
}
