import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { TenantId } from '@common/decorators';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @TenantId() tenantId: string) {
    return this.orderService.create(createOrderDto, tenantId);
  }

  @Get()
  findPage(@TenantId() tenantId: string, @Query() query: QueryOrderDto) {
    return this.orderService.findPage(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.orderService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @TenantId() tenantId: string,
  ) {
    return this.orderService.update(id, updateOrderDto, tenantId);
  }

  @Post(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @TenantId() tenantId: string,
  ) {
    return this.orderService.updateStatus(id, dto, tenantId);
  }

  @Get(':id/logs')
  findLogs(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.orderService.findLogs(id, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.orderService.remove(id, tenantId);
  }
}
