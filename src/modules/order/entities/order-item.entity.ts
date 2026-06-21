import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ nullable: true })
  productId: string | null;

  @Column({ length: 80, nullable: true })
  sku: string | null;

  @Column({ length: 120 })
  productName: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  quantity: number;

  @Column({ length: 30, nullable: true })
  unitCode: string | null;

  @Column({ length: 30, nullable: true })
  unitName: string | null;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  price: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'json', nullable: true })
  specs: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  customRequirement: string | null;

  @Column({ type: 'json', nullable: true })
  drawingUrls: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
