import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
  ) {}

  async create(createInventoryDto: CreateInventoryDto, tenantId: string): Promise<Inventory> {
    const inventory = this.inventoryRepository.create({
      ...createInventoryDto,
      tenantId,
    });
    return this.inventoryRepository.save(inventory);
  }

  async findAll(tenantId: string): Promise<Inventory[]> {
    return this.inventoryRepository.find({ where: { tenantId } });
  }

  async findOne(id: string, tenantId: string): Promise<Inventory> {
    return this.inventoryRepository.findOne({ where: { id, tenantId } });
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
    tenantId: string,
  ): Promise<Inventory> {
    await this.inventoryRepository.update({ id, tenantId }, updateInventoryDto);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.inventoryRepository.delete({ id, tenantId });
  }
}
