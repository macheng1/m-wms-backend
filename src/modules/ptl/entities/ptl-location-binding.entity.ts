import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Location } from '@/modules/location/entities/location.entity';
import { Device } from '@/modules/location/entities/device.entity';

@Entity('ptl_location_bindings')
@Unique('UQ_ptl_binding_tenant_location', ['tenantId', 'locationId'])
@Unique('UQ_ptl_binding_tenant_device_led', ['tenantId', 'deviceId', 'ledIndex'])
@Index('IDX_ptl_binding_tenant_device', ['tenantId', 'deviceId'])
export class PtlLocationBinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  tenantId: string;

  @Column({ type: 'char', length: 36 })
  locationId: string;

  @ManyToOne(() => Location, { eager: false })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @Column({ type: 'char', length: 36 })
  deviceId: string;

  @ManyToOne(() => Device, { eager: false })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column({ type: 'int' })
  ledIndex: number;

  @Column({ length: 30, default: 'blue' })
  defaultColor: string;

  @Column({ type: 'tinyint', default: 1 })
  enabled: number;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
