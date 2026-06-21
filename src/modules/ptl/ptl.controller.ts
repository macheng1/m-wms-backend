import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '@/common/decorators';
import { PtlService } from './ptl.service';
import {
  CalibrateDto,
  ConfirmPtlDto,
  LightOffDto,
  LightUpDto,
  SavePtlBindingDto,
  SavePtlControllerDto,
} from './dto/ptl.dto';

@ApiTags('PTL货位灯')
@Controller('ptl')
export class PtlController {
  constructor(private readonly ptlService: PtlService) {}

  @Post('light-up')
  @ApiOperation({ summary: '按 SKU 或库位点亮货位灯' })
  lightUp(@TenantId() tenantId: string, @Req() req: any, @Body() dto: LightUpDto) {
    return this.ptlService.lightUp(tenantId, this.getUserId(req), dto);
  }

  @Post('light-off')
  @ApiOperation({ summary: '关闭 PTL 找货任务灯光' })
  lightOff(@TenantId() tenantId: string, @Body() dto: LightOffDto) {
    return this.ptlService.lightOff(tenantId, dto.taskId);
  }

  @Post('confirm')
  @ApiOperation({ summary: '确认 PTL 找货库位' })
  confirm(@TenantId() tenantId: string, @Req() req: any, @Body() dto: ConfirmPtlDto) {
    return this.ptlService.confirm(tenantId, this.getUserId(req), dto);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: '获取 PTL 找货任务详情' })
  findTask(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ptlService.findTask(tenantId, id);
  }

  @Get('controllers')
  @ApiOperation({ summary: '获取 PTL 控制器列表' })
  findControllers(@TenantId() tenantId: string) {
    return this.ptlService.findControllers(tenantId);
  }

  @Post('controllers')
  @ApiOperation({ summary: '新增或更新 PTL 控制器' })
  saveController(@TenantId() tenantId: string, @Body() dto: SavePtlControllerDto) {
    return this.ptlService.saveController(tenantId, dto);
  }

  @Delete('controllers/:id')
  @ApiOperation({ summary: '删除 PTL 控制器' })
  removeController(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ptlService.removeController(tenantId, id);
  }

  @Get('controllers/status')
  @ApiOperation({ summary: '获取 PTL 控制器在线状态' })
  getControllerStatus(@TenantId() tenantId: string) {
    return this.ptlService.getControllerStatus(tenantId);
  }

  @Post('controllers/refresh-base-colors')
  @ApiOperation({ summary: '刷新常驻库存底色（不传 deviceId 则刷新全部在线控制器）' })
  refreshBaseColors(@TenantId() tenantId: string, @Body('deviceId') deviceId?: string) {
    return this.ptlService.refreshBaseColors(tenantId, deviceId);
  }

  @Post('controllers/:id/calibrate')
  @ApiOperation({ summary: '校准点亮控制器单颗灯' })
  calibrate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CalibrateDto,
  ) {
    return this.ptlService.calibrate(tenantId, id, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: '获取库位灯绑定列表' })
  findBindings(
    @TenantId() tenantId: string,
    @Query('locationId') locationId?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.ptlService.findBindings(tenantId, { locationId, deviceId });
  }

  @Post('devices')
  @ApiOperation({ summary: '新增或更新库位灯绑定' })
  saveBinding(@TenantId() tenantId: string, @Body() dto: SavePtlBindingDto) {
    return this.ptlService.saveBinding(tenantId, dto);
  }

  @Delete('devices/:id')
  @ApiOperation({ summary: '删除库位灯绑定' })
  removeBinding(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ptlService.removeBinding(tenantId, id);
  }

  private getUserId(req: any) {
    return req?.user?.userId || req?.user?.id || req?.user?.sub || null;
  }
}
