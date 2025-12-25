import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { TenantId } from '@common/decorators';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(@Body() createInventoryDto: CreateInventoryDto, @TenantId() tenantId: string) {
    return this.inventoryService.create(createInventoryDto, tenantId);
  }

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.inventoryService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.inventoryService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
    @TenantId() tenantId: string,
  ) {
    return this.inventoryService.update(id, updateInventoryDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.inventoryService.remove(id, tenantId);
  }
}
