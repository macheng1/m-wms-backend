import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderFlowLog } from './entities/order-flow-log.entity';
import { Product } from '../product/product.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';
import { InventoryLocation } from '../location/entities/inventory-location.entity';
import { MiniappMember } from '../miniapp/entities/miniapp-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderFlowLog,
      Product,
      Inventory,
      InventoryLocation,
      InventoryTransaction,
      MiniappMember,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
