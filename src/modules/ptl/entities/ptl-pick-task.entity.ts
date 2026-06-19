import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PtlPickTaskItem } from './ptl-pick-task-item.entity';

export enum PtlPickTaskStatus {
  CREATED = 'CREATED',
  LIGHTING = 'LIGHTING',
  ACTIVE = 'ACTIVE',
  PARTIAL_CONFIRMED = 'PARTIAL_CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export enum PtlPickTaskSource {
  APP = 'APP',
  ADMIN = 'ADMIN',
  API = 'API',
}

@Entity('ptl_pick_tasks')
@Unique('UQ_ptl_pick_tasks_task_no', ['tenantId', 'taskNo'])
@Index('IDX_ptl_pick_tasks_status_expire', ['tenantId', 'status', 'expiresAt'])
@Index('IDX_ptl_pick_tasks_user_status', ['tenantId', 'requestedBy', 'status'])
@Index('IDX_ptl_pick_tasks_sku', ['tenantId', 'sku'])
export class PtlPickTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  tenantId: string;

  @Column({ length: 50, nullable: true })
  taskNo: string;

  @Column({ length: 100 })
  sku: string;

  @Column({ length: 200, nullable: true })
  productName: string;

  @Column({
    type: 'enum',
    enum: PtlPickTaskStatus,
    default: PtlPickTaskStatus.CREATED,
  })
  status: PtlPickTaskStatus;

  @Column({ length: 30, default: PtlPickTaskSource.APP })
  source: PtlPickTaskSource;

  @Column({ type: 'char', length: 36, nullable: true })
  requestedBy: string;

  @Column({ type: 'int', default: 0 })
  totalLocations: number;

  @Column({ type: 'int', default: 0 })
  confirmedLocations: number;

  @Column({ type: 'int', default: 600 })
  ttlSeconds: number;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => PtlPickTaskItem, (item) => item.task)
  items: PtlPickTaskItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
