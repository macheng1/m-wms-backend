// src/modules/tenants/tenants.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

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
  @HttpCode(HttpStatus.OK) // 确保成功时返回 200 而非 201
  @ApiOperation({ summary: '新工厂/租户入驻' })
  @ApiResponse({ status: 200, description: '入驻成功，返回生成的租户及管理员信息' })
  async onboard(@Body() createTenantDto: CreateTenantDto) {
    // 直接返回 Service 的执行结果
    // 拦截器会自动将其包装为 { code: 200, data: result, message: '请求成功' }
    return await this.tenantsService.onboard(createTenantDto);
  }
}
