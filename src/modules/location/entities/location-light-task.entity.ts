import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LightTaskAction {
  ON = 'ON',
  OFF = 'OFF',
}

export enum LightTaskStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('location_light_tasks')
@Index('location_light_task_tenant_location_idx', ['tenantId', 'locationId'])
export class LocationLightTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  tenantId: string;

  @Column({ type: 'char', length: 36 })
  locationId: string;

  @Column({ length: 50 })
  locationCode: string;

  @Column({ length: 50, nullable: true })
  deviceCode: string;

  @Column({ length: 255, nullable: true })
  deviceUrl: string;

  @Column({ type: 'int', nullable: true })
  ledIndex: number;

  @Column({ type: 'enum', enum: LightTaskAction })
  action: LightTaskAction;

  @Column({
    type: 'enum',
    enum: LightTaskStatus,
    default: LightTaskStatus.PENDING,
  })
  status: LightTaskStatus;

  @Column({ type: 'int', default: 60 })
  duration: number;

  @Column({ length: 30, default: 'yellow' })
  color: string;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'datetime', nullable: true })
  executedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
