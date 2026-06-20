import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Header,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InboundDto, BatchInboundDto } from './dto/inbound.dto';
import { OutboundDto, BatchOutboundDto } from './dto/outbound.dto';
import { AdjustInventoryDto } from './dto/adjust.dto';
import { InventoryResult } from './dto/inventory-result.dto';
import { TenantId } from '@common/decorators';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('库存管理')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({ summary: '创建库存记录' })
  create(@Body() createInventoryDto: CreateInventoryDto, @TenantId() tenantId: string) {
    return this.inventoryService.create(createInventoryDto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: '获取库存列表' })
  findAll(@TenantId() tenantId: string) {
    return this.inventoryService.findAll(tenantId);
  }

  @Get('page')
  @ApiOperation({ summary: '分页获取库存列表' })
  findPage(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sku') sku?: string,
    @Query('keyword') keyword?: string,
    @Query('stockStatus') stockStatus?: string,
  ) {
    return this.inventoryService.findPage(tenantId, { page, pageSize, sku, keyword, stockStatus });
  }

  @Get('alerts')
  @ApiOperation({ summary: '获取库存告警列表（低库存）' })
  getAlerts(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('isResolved') isResolved?: string,
  ) {
    return this.inventoryService.getAlerts(tenantId, { page, pageSize, isResolved });
  }

  @Get('transactions')
  @ApiOperation({ summary: '获取库存流水分页列表' })
  getTransactionsPage(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sku') sku?: string,
    @Query('type') type?: string,
    @Query('transactionType') transactionType?: string,
    @Query('orderNo') orderNo?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getTransactionsPage(tenantId, {
      page,
      pageSize,
      sku,
      type: type || transactionType,
      orderNo,
      startDate,
      endDate,
    });
  }

  @Get('transactions/export')
  @ApiOperation({ summary: '导出库存流水 Excel' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportTransactions(
    @TenantId() tenantId: string,
    @Res() res: Response,
    @Query('sku') sku?: string,
    @Query('type') type?: string,
    @Query('transactionType') transactionType?: string,
    @Query('orderNo') orderNo?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const buffer = await this.inventoryService.exportTransactions(tenantId, {
      sku,
      type: type || transactionType,
      orderNo,
      startDate,
      endDate,
    });
    // 文件名：库存流水_当前年月日（本地时区，避免 UTC 跨零点差一天），中文用 encodeURIComponent
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const filename = encodeURIComponent(`库存流水_${dateStr}.xlsx`);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.end(buffer);
  }

  @Get('available-for-outbound')
  @ApiOperation({ summary: '获取可出库库存列表（下拉选择）' })
  getAvailableForOutbound(
    @TenantId() tenantId: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.inventoryService.getAvailableForOutbound(tenantId, { keyword });
  }

  @Get('locations')
  @ApiOperation({ summary: '按 SKU 查询库位分布' })
  getLocationsBySku(
    @TenantId() tenantId: string,
    @Query('sku') sku: string,
    @Query('onlyAvailable') onlyAvailable?: string,
  ) {
    return this.inventoryService.findLocationsBySku(tenantId, {
      sku,
      onlyAvailable: onlyAvailable === 'true' || onlyAvailable === '1',
    });
  }

  // ============ 入库操作 ============

  @Get('inbound')
  @ApiOperation({ summary: '获取入库流水列表' })
  getInboundTransactions(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sku') sku?: string,
    @Query('transactionType') transactionType?: string,
    @Query('orderNo') orderNo?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getInboundTransactionsPage(tenantId, {
      page,
      pageSize,
      sku,
      transactionType,
      orderNo,
      startDate,
      endDate,
    });
  }

  @Post('inbound')
  @ApiOperation({ summary: '入库操作' })
  inbound(@Body() dto: InboundDto, @TenantId() tenantId: string) {
    return this.inventoryService.inbound(dto, tenantId);
  }

  @Post('inbound/batch')
  @ApiOperation({ summary: '批量入库' })
  batchInbound(@Body() dto: BatchInboundDto, @TenantId() tenantId: string) {
    return this.inventoryService.batchInbound(dto, tenantId);
  }

  // ============ 库存调整 ============

  @Post('adjust')
  @ApiOperation({ summary: '库存调整' })
  adjust(@Body() dto: AdjustInventoryDto, @TenantId() tenantId: string) {
    return this.inventoryService.adjust(dto, tenantId);
  }

  // ============ 出库操作 ============

  @Get('outbound')
  @ApiOperation({ summary: '获取出库流水列表' })
  getOutboundTransactions(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sku') sku?: string,
    @Query('transactionType') transactionType?: string,
    @Query('orderNo') orderNo?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getOutboundTransactionsPage(tenantId, {
      page,
      pageSize,
      sku,
      transactionType,
      orderNo,
      startDate,
      endDate,
    });
  }

  @Post('outbound')
  @ApiOperation({ summary: '出库操作' })
  outbound(@Body() dto: OutboundDto, @TenantId() tenantId: string) {
    return this.inventoryService.outbound(dto, tenantId);
  }

  @Post('outbound/batch')
  @ApiOperation({ summary: '批量出库' })
  batchOutbound(@Body() dto: BatchOutboundDto, @TenantId() tenantId: string) {
    return this.inventoryService.batchOutbound(dto, tenantId);
  }

  // ============ 动态路由（放在最后）=============

  @Get(':id')
  @ApiOperation({ summary: '获取库存详情' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.inventoryService.findOne(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新库存记录' })
  update(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
    @TenantId() tenantId: string,
  ) {
    return this.inventoryService.update(id, updateInventoryDto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除库存记录' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.inventoryService.remove(id, tenantId);
  }

  @Get(':sku/transactions')
  @ApiOperation({ summary: '获取库存流水' })
  getTransactions(@Param('sku') sku: string, @TenantId() tenantId: string) {
    return this.inventoryService.getTransactions(sku, tenantId);
  }
}
