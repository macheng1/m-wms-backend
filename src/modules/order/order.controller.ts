import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { TenantId } from '@common/decorators';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('订单管理')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  create(@Body() createOrderDto: CreateOrderDto, @TenantId() tenantId: string) {
    return this.orderService.create(createOrderDto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: '分页查询订单列表' })
  findPage(@TenantId() tenantId: string, @Query() query: QueryOrderDto) {
    return this.orderService.findPage(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询订单详情' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.orderService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新订单信息' })
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @TenantId() tenantId: string,
  ) {
    return this.orderService.update(id, updateOrderDto, tenantId);
  }

  @Post(':id/status')
  @ApiOperation({ summary: '更新订单状态' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @TenantId() tenantId: string,
  ) {
    return this.orderService.updateStatus(id, dto, tenantId);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '查询订单流转日志' })
  findLogs(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.orderService.findLogs(id, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除订单' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.orderService.remove(id, tenantId);
  }
}
