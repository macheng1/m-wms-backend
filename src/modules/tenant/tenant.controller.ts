// src/modules/tenants/tenants.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
  Delete,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { DetailTenantDto } from './dto/detail-tenant.dto';
import { TenantsService } from './tenants.service';
import { Public } from '@/common/decorators/public.decorator';
import { PublicTenantDetailDto, PublicTenantListDto } from './dto/public-tenant.dto';
import { AuditLogService } from '@/common/audit/audit-log.service';

@ApiTags('租户管理 (SaaS)') // 更加清晰的 Swagger 分类
@Controller('tenants')
export class TenantController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 工厂入驻 (Onboard)
   * 现在的逻辑：Controller 只负责接收参数并调用 Service，
   * 响应结构的格式化交由 TransformInterceptor 全局处理。
   */
  @Post('onboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '新工厂/租户入驻' })
  @ApiResponse({ status: 200, description: '入驻成功，返回生成的租户及管理员信息' })
  @Public()
  async onboard(@Body() createTenantDto: CreateTenantDto) {
    return await this.tenantsService.onboard(createTenantDto);
  }

  @Post('list')
  @ApiOperation({ summary: '分页查询租户列表' })
  async findAll(
    @Body()
    body: {
      page?: number;
      pageSize?: number;
      tenantSource?: 'platform' | 'miniapp' | 'import' | 'api' | 'all';
    },
  ) {
    const { page = 1, pageSize = 20, tenantSource } = body || {};
    return await this.tenantsService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      tenantSource,
    });
  }

  @Post('public/list')
  @ApiOperation({ summary: '公开分页查询租户列表' })
  @Public()
  async publicFindAll(@Body() body: PublicTenantListDto, @Req() req) {
    const { page = 1, pageSize = 20, tenantSource, name } = body || {};
    const result = await this.tenantsService.findPublicAll({
      page: Number(page),
      pageSize: Number(pageSize),
      tenantSource,
      name,
    });
    await this.auditLogService.record({
      scope: 'platform',
      module: 'open-api',
      action: 'tenant.public.list',
      targetType: 'tenant',
      description: '第三方调用租户公开列表',
      ip: this.auditLogService.fromRequest(req).ip,
    });
    return result;
  }

  @Post('detail')
  @ApiOperation({ summary: '获取租户详情' })
  async findOne(@Body() body: DetailTenantDto) {
    return await this.tenantsService.findOne(body.id);
  }

  @Post('public/detail')
  @ApiOperation({ summary: '公开获取租户详情' })
  @Public()
  async publicFindOne(@Body() body: PublicTenantDetailDto, @Req() req) {
    const result = await this.tenantsService.findPublicOne(body.id);
    await this.auditLogService.record({
      scope: 'platform',
      module: 'open-api',
      action: 'tenant.public.detail',
      targetType: 'tenant',
      targetId: body.id,
      description: '第三方调用租户公开详情',
      ip: this.auditLogService.fromRequest(req).ip,
    });
    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改租户信息' })
  async update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    // 这里假设 tenantsService 有 update 方法，需自行实现
    return await this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除租户' })
  async remove(@Param('id') id: string) {
    // 这里假设 tenantsService 有 remove 方法，需自行实现
    return await this.tenantsService.remove(id);
  }
}
