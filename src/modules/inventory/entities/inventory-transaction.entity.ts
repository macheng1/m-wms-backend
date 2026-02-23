import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '../../../database/base.entity';
import { TransactionType } from '../../../common/constants/unit.constant';

@Entity('inventory_transactions')
export class InventoryTransaction extends TenantBaseEntity {
  @Column({ length: 100 })
  sku: string;

  @Column({ length: 200 })
  productName: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantity: number;

  @Index()
  @Column({ type: 'char', length: 36, nullable: true })
  unitId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  beforeQty: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  afterQty: number;

  @Column({ length: 100, nullable: true })
  orderNo: string;

  @Index('inventory_transaction_location_id_idx')
  @Column({ type: 'char', length: 36, nullable: true })
  locationId: string;

  @Column({ type: 'text', nullable: true })
  remark: string;
}
