import { Controller, Get, Patch, Body, UseGuards, Req, Query, Post, Param } from '@nestjs/common';
import { PortalService } from './portal.service';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { UpdatePortalConfigDto } from './dto/update-portal-config.dto';
import { QueryPortalJobDto, SavePortalJobDto } from './dto/portal-job.dto';
import { UpdateInquiryRemarkDto, UpdateInquiryStatusDto } from './dto/update-inquiry.dto';

@ApiTags('管理后台 - 网站管理')
@ApiBearerAuth()
@Controller('portal')
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
  async getInquiries(
    @Req() req,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('name') name?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.portalService.getInquiries(tenantId, page, pageSize, { name, status });
  }

  @Get('inquiries/:id')
  @ApiOperation({ summary: '获取访客询盘详情' })
  async getInquiryDetail(@Req() req, @Param('id') id: string) {
    return this.portalService.getInquiryDetail(req.user.tenantId, id);
  }

  @Post('inquiries/:id/status')
  @ApiOperation({ summary: '更新访客询盘状态' })
  async updateInquiryStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    return this.portalService.updateInquiryStatus(req.user.tenantId, id, dto.status);
  }

  @Post('inquiries/:id/remark')
  @ApiOperation({ summary: '保存访客询盘后台备注' })
  async updateInquiryRemark(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateInquiryRemarkDto,
  ) {
    return this.portalService.updateInquiryRemark(req.user.tenantId, id, dto.adminRemark || '');
  }

  @Get('jobs')
  @ApiOperation({ summary: '获取官网招聘列表' })
  async getJobs(@Req() req, @Query() query: QueryPortalJobDto) {
    return this.portalService.getJobs(req.user.tenantId, query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: '获取官网招聘职位详情' })
  async getJobDetail(@Req() req, @Param('id') id: string) {
    return this.portalService.getJobDetail(req.user.tenantId, id);
  }

  @Post('jobs/save')
  @ApiOperation({ summary: '保存官网招聘职位' })
  async saveJob(@Req() req, @Body() dto: SavePortalJobDto) {
    return this.portalService.saveJob(req.user.tenantId, dto);
  }

  @Post('jobs/delete')
  @ApiOperation({ summary: '删除官网招聘职位' })
  async deleteJob(@Req() req, @Body('id') id: string) {
    return this.portalService.deleteJob(req.user.tenantId, id);
  }
}
