import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { Location } from './entities/location.entity';
import { Device } from './entities/device.entity';
import { DeviceEvent } from './entities/device-event.entity';
import { InventoryLocation } from './entities/inventory-location.entity';
import { Inventory } from '../inventory/entities/inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      Device,
      DeviceEvent,
      InventoryLocation,
      Inventory,
    ]),
  ],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
