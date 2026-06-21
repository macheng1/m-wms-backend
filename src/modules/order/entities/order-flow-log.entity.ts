import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order, OrderStatus } from './order.entity';

@Entity('order_flow_logs')
export class OrderFlowLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.flowLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'varchar', length: 40, nullable: true })
  fromStatus: OrderStatus | null;

  @Column({ type: 'varchar', length: 40 })
  toStatus: OrderStatus;

  @Column({ length: 50 })
  action: string;

  @Column({ nullable: true })
  operatorId: string | null;

  @Column({ nullable: true, length: 80 })
  operatorName: string | null;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
