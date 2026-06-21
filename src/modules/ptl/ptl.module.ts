import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '@/modules/location/entities/device.entity';
import { InventoryLocation } from '@/modules/location/entities/inventory-location.entity';
import { Location } from '@/modules/location/entities/location.entity';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { Product } from '@/modules/product/product.entity';
import { PtlLocationBinding } from './entities/ptl-location-binding.entity';
import { PtlPickTask } from './entities/ptl-pick-task.entity';
import { PtlPickTaskItem } from './entities/ptl-pick-task-item.entity';
import { PtlCommandGateway } from './ptl-command.gateway';
import { PtlController } from './ptl.controller';
import { PtlService } from './ptl.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Device,
      Location,
      InventoryLocation,
      Product,
      PtlLocationBinding,
      PtlPickTask,
      PtlPickTaskItem,
    ]),
    NotificationsModule,
  ],
  controllers: [PtlController],
  providers: [PtlService, PtlCommandGateway],
  exports: [PtlService],
})
export class PtlModule {}
