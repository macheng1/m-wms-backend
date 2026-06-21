import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { Inventory } from './entities/inventory.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { UnitModule } from '../unit/unit.module';
import { Product } from '../product/product.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryLocation } from '../location/entities/inventory-location.entity';
import { Location } from '../location/entities/location.entity';
import { Device } from '../location/entities/device.entity';
import { PtlLocationBinding } from '../ptl/entities/ptl-location-binding.entity';
import { PtlModule } from '../ptl/ptl.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,
      InventoryTransaction,
      Product,
      InventoryLocation,
      Location,
      Device,
      PtlLocationBinding,
    ]),
    UnitModule,
    NotificationsModule,
    PtlModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
