import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { Location } from './entities/location.entity';
import { Device } from './entities/device.entity';
import { DeviceEvent } from './entities/device-event.entity';
import { InventoryLocation } from './entities/inventory-location.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { PtlLocationBinding } from '../ptl/entities/ptl-location-binding.entity';
import { PtlModule } from '../ptl/ptl.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      Device,
      DeviceEvent,
      InventoryLocation,
      Inventory,
      PtlLocationBinding,
    ]),
    PtlModule,
  ],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
