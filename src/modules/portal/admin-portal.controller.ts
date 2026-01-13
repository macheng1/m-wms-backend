import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { PortalService } from './portal.service';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { UpdatePortalConfigDto } from './dto/update-portal-config.dto';

@ApiTags('管理后台 - 网站管理')
@ApiBearerAuth()
@Controller('admin/portal')
@UseGuards(JwtAuthGuard) // 💡 强制鉴权，只有登录用户能修改配置
export class AdminPortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * 获取当前租户的网站配置
   * 即使数据库没数据，也会返回一个初始化的对象
   */
  @Get('config')
  @ApiOperation({ summary: '获取网站配置' })
  async getConfig(@Req() req) {
    // 从 JWT 中解析出的用户信息中获取 tenantId
    const tenantId = req.user.tenantId;
    return this.portalService.updateConfig(tenantId, {});
  }

  /**
   * 更新网站配置 (Logo, Slogan, 关于我们, 页脚等)
   */
  @Patch('config')
  async updateConfig(
    @Req() req,
    @Body() dto: UpdatePortalConfigDto, // 💡 使用 DTO
  ) {
    return this.portalService.updateConfig(req.user.tenantId, dto);
  }
  /**
   * 获取该工厂收到的访客留言/询盘列表
   */
  @Get('inquiries')
  @ApiOperation({ summary: '获取访客询盘列表' })
  async getInquiries(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.portalService.getInquiries(tenantId);
  }
}
