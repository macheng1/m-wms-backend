import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Inventory } from './entities/inventory.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { UnitModule } from '../unit/unit.module';
import { Product } from '../product/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, InventoryTransaction, Product]),
    UnitModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
