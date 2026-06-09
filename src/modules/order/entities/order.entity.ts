import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderFlowLog } from './order-flow-log.entity';

export enum OrderSource {
  MINIAPP = 'MINIAPP',
  WEBSITE = 'WEBSITE',
  ADMIN = 'ADMIN',
}

export enum OrderType {
  STANDARD = 'STANDARD',
  CUSTOM = 'CUSTOM',
}

export enum OrderStatus {
  PENDING_CONFIRM = 'PENDING_CONFIRM',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REJECTED = 'REJECTED',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  STOCK_LOCKED = 'STOCK_LOCKED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  PENDING_SCHEDULE = 'PENDING_SCHEDULE',
  SCHEDULED = 'SCHEDULED',
  PRODUCING = 'PRODUCING',
  PRODUCED = 'PRODUCED',
  PENDING_SHIPMENT = 'PENDING_SHIPMENT',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
@Unique(['tenantId', 'orderNumber'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ length: 50 })
  orderNumber: string;

  @Column({ type: 'enum', enum: OrderSource, default: OrderSource.ADMIN })
  source: OrderSource;

  @Column({ type: 'enum', enum: OrderType, default: OrderType.STANDARD })
  orderType: OrderType;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_CONFIRM })
  status: OrderStatus;

  @Column({ nullable: true, length: 80 })
  customerName: string | null;

  @Column({ nullable: true, length: 30 })
  customerPhone: string | null;

  @Column({ nullable: true, length: 120 })
  customerEmail: string | null;

  @Column({ nullable: true, length: 255 })
  customerAddress: string | null;

  @Column({ nullable: true, length: 36 })
  miniappMemberId: string | null;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @Column({ type: 'text', nullable: true })
  reviewRemark: string | null;

  @Column({ type: 'text', nullable: true })
  rejectReason: string | null;

  @Column({ type: 'datetime', nullable: true })
  expectedDeliveryDate: Date | null;

  @Column({ type: 'datetime', nullable: true })
  scheduledStartDate: Date | null;

  @Column({ type: 'datetime', nullable: true })
  scheduledEndDate: Date | null;

  @Column({ type: 'datetime', nullable: true })
  producedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  shippedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderFlowLog, (log) => log.order)
  flowLogs: OrderFlowLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
