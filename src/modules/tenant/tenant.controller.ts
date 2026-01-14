// src/modules/tenants/tenants.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, Param, Delete, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { DetailTenantDto } from './dto/detail-tenant.dto';
import { TenantsService } from './tenants.service';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('租户管理 (SaaS)') // 更加清晰的 Swagger 分类
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantsService: TenantsService) {}

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
  async findAll(@Body() body: { page?: number; pageSize?: number }) {
    const { page = 1, pageSize = 20 } = body || {};
    return await this.tenantsService.findAll({ page: Number(page), pageSize: Number(pageSize) });
  }

  @Post('detail')
  @ApiOperation({ summary: '获取租户详情' })
  async findOne(@Body() body: DetailTenantDto) {
    return await this.tenantsService.findOne(body.id);
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
