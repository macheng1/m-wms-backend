import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('库位管理')
@Controller('locations')
@ApiBearerAuth()
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * 创建库位
   */
  @Post()
  @ApiOperation({ summary: '创建库位' })
  create(
    @Body() createLocationDto: CreateLocationDto,
    @TenantId() tenantId: string,
  ) {
    return this.locationService.create(createLocationDto, tenantId);
  }

  /**
   * 批量创建库位
   */
  @Post('batch')
  @ApiOperation({ summary: '批量创建库位（预留，用于快速初始化）' })
  batchCreate(
    @Body()
    pattern: {
      warehouse: string;
      area: string;
      shelfStart: number;
      shelfEnd: number;
      levels: number;
      positions: number;
    },
    @TenantId() tenantId: string,
  ) {
    return this.locationService.batchCreate(pattern, tenantId);
  }

  /**
   * 查询库位列表
   */
  @Get()
  @ApiOperation({ summary: '查询库位列表' })
  findAll(
    @TenantId() tenantId: string,
    @Query() query: QueryLocationDto,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.locationService.findAll(tenantId, {
      ...query,
      page,
      pageSize,
    });
  }

  /**
   * 获取可选择的库位列表（用于下拉选择）
   * 注意：此路由必须在 @Get(':id') 之前，否则会被 :id 路由拦截
   */
  @Get('available-for-selection')
  @ApiOperation({ summary: '获取可选择的库位列表（下拉选择）' })
  getAvailableForSelection(
    @TenantId() tenantId: string,
    @Query('keyword') keyword?: string,
    @Query('warehouse') warehouse?: string,
    @Query('area') area?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.locationService.getAvailableForSelection(tenantId, {
      keyword,
      warehouse,
      area,
      type: type as any,
      status: status as any,
      limit,
    });
  }

  /**
   * 查询库位详情
   */
  @Get(':id')
  @ApiOperation({ summary: '查询库位详情' })
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.locationService.findOne(id, tenantId);
  }

  /**
   * 根据编码查询库位
   */
  @Get('code/:code')
  @ApiOperation({ summary: '根据编码查询库位' })
  findByCode(@Param('code') code: string, @TenantId() tenantId: string) {
    return this.locationService.findByCode(code, tenantId);
  }

  /**
   * 更新库位
   */
  @Put(':id')
  @ApiOperation({ summary: '更新库位' })
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @TenantId() tenantId: string,
  ) {
    return this.locationService.update(id, updateLocationDto, tenantId);
  }

  /**
   * 删除库位
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除库位' })
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.locationService.remove(id, tenantId);
  }

  // ==================== 硬件预留接口（暂不实现）====================

  /**
   * 绑定设备到库位（预留硬件集成）
   */
  @Post(':id/bind-device')
  @ApiOperation({ summary: '绑定设备到库位（预留）' })
  bindDevice(
    @Param('id') id: string,
    @Body() { deviceId }: { deviceId: string },
    @TenantId() tenantId: string,
  ) {
    return this.locationService.bindDevice(id, deviceId, tenantId);
  }

  /**
   * 解绑设备（预留硬件集成）
   */
  @Post(':id/unbind-device')
  @ApiOperation({ summary: '解绑设备（预留）' })
  unbindDevice(
    @Param('id') id: string,
    @Body() { deviceId }: { deviceId: string },
    @TenantId() tenantId: string,
  ) {
    return this.locationService.unbindDevice(id, deviceId, tenantId);
  }

  /**
   * 更新库位实时数据（预留硬件集成）
   */
  @Post(':id/realtime')
  @ApiOperation({ summary: '更新库位实时数据（预留）' })
  updateRealtimeData(
    @Param('id') id: string,
    @Body() data: any,
    @TenantId() tenantId: string,
  ) {
    return this.locationService.updateRealtimeData(id, data, tenantId);
  }
}
