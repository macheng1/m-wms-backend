import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictionariesController } from './controller/dictionaries.controller';
import { DictionariesService } from './service/dictionaries.service';
import { Dictionary } from './entities/dictionary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dictionary])],
  controllers: [DictionariesController],
  providers: [DictionariesService],
  exports: [DictionariesService],
})
export class SystemModule {}
