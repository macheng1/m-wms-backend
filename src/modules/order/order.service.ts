import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { BusinessException } from '@/common/filters/business.exception';
import { Order, OrderSource, OrderStatus, OrderType } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderFlowLog } from './entities/order-flow-log.entity';
import { CreateOrderDto } from './dto/create-order.dto';
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
        [OrderStatus.PENDING_CONFIRM]: [OrderStatus.PENDING_REVIEW, OrderStatus.CANCELLED],
        [OrderStatus.PENDING_REVIEW]: [OrderStatus.PENDING_SCHEDULE, OrderStatus.REJECTED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.PENDING_SCHEDULE, OrderStatus.CANCELLED],
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
        OrderStatus.OUT_OF_STOCK,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PENDING_REVIEW]: [OrderStatus.CONFIRMED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.STOCK_LOCKED,
        OrderStatus.PENDING_SHIPMENT,
        OrderStatus.OUT_OF_STOCK,
        OrderStatus.CANCELLED,
      ],
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

      order.items = (createOrderDto.items || []).map((item) =>
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
      return this.findOne(saved.id, tenantId);
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
