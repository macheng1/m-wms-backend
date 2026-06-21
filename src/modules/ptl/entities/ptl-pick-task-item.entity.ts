import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Location } from '@/modules/location/entities/location.entity';
import { Device } from '@/modules/location/entities/device.entity';
import { InventoryLocation } from '@/modules/location/entities/inventory-location.entity';
import { PtlPickTask } from './ptl-pick-task.entity';

export enum PtlPickTaskItemStatus {
  PENDING = 'PENDING',
  LIGHTING = 'LIGHTING',
  ACTIVE = 'ACTIVE',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

@Entity('ptl_pick_task_items')
@Index('IDX_ptl_task_items_task', ['taskId'])
@Index('IDX_ptl_task_items_location_status', ['tenantId', 'locationId', 'status'])
@Index('IDX_ptl_task_items_request', ['tenantId', 'requestId'])
export class PtlPickTaskItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  tenantId: string;

  @Column({ type: 'char', length: 36 })
  taskId: string;

  @ManyToOne(() => PtlPickTask, (task) => task.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: PtlPickTask;

  @Column({ type: 'char', length: 36 })
  locationId: string;

  @ManyToOne(() => Location, { eager: false })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @Column({ length: 50 })
  locationCode: string;

  @Column({ type: 'char', length: 36, nullable: true })
  inventoryLocationId: string;

  @ManyToOne(() => InventoryLocation, { eager: false, nullable: true })
  @JoinColumn({ name: 'inventoryLocationId' })
  inventoryLocation: InventoryLocation;

  @Column({ type: 'char', length: 36, nullable: true })
  deviceId: string;

  @ManyToOne(() => Device, { eager: false, nullable: true })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column({ type: 'int', nullable: true })
  ledIndex: number;

  @Column({
    type: 'enum',
    enum: PtlPickTaskItemStatus,
    default: PtlPickTaskItemStatus.PENDING,
  })
  status: PtlPickTaskItemStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  availableQuantity: number;

  @Column({ length: 50, nullable: true })
  batchNo: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ length: 64, nullable: true })
  requestId: string;

  @Column({ type: 'datetime', nullable: true })
  ackAt: Date;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'char', length: 36, nullable: true })
  confirmedBy: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
