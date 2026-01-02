import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptionsController } from './controller/attribute-options.controller';
import { OptionsService } from './service/attributes-option.service';
import { AttributeOption } from './entities/attribute-option.entity';
import { Attribute } from './entities/attribute.entity';
import { AttributesController } from './controller/attributes.controller';
import { AttributesService } from './service/attributes.service';

@Module({
  imports: [TypeOrmModule.forFeature([AttributeOption, Attribute])],
  controllers: [OptionsController, AttributesController],
  providers: [OptionsService, AttributesService],
  exports: [OptionsService, AttributesService],
})
export class ProductModule {}
