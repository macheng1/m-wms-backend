// src/modules/portal/portal.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PortalService } from './portal.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { Public } from '@/common/decorators/public.decorator';

@Controller('portal/:domain') // 💡 匹配 https://.../portal/ent-wxyskj-xc7n/zh
@Public()
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * 官网初始化：一次性获取配置、产品分类和产品
   */
  @Get('init')
  async getPortalInit(@Param('domain') domain: string) {
    return this.portalService.getPortalInitData(domain);
  }

  /**
   * 产品详情接口
   */
  @Get('products/:id')
  async getProductDetail(@Param('domain') domain: string, @Param('id') id: string) {
    return this.portalService.getProductDetail(domain, id);
  }

  /**
   * 访客提交询盘/留言
   */
  @Post('inquiry')
  async inquiry(
    @Param('domain') domain: string,
    @Body() dto: CreateInquiryDto, // 💡 使用 DTO
  ) {
    return this.portalService.submitInquiry(domain, dto);
  }
}
