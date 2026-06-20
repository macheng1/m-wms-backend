import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PlatformAdminGuard } from '@/common/guards/platform-admin.guard';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import {
  QueryMiniappBannerDto,
  SaveMiniappBannerDto,
  UpdateMiniappBannerStatusDto,
} from './dto/miniapp-banner.dto';
import {
  QueryMiniappCategoryDto,
  SaveMiniappCategoryDto,
  UpdateMiniappCategoryStatusDto,
} from './dto/miniapp-category.dto';
import { MiniappService } from './miniapp.service';
import { MiniappSilentLoginDto } from './dto/miniapp-auth.dto';
import { ApplyMiniappTenantDto } from './dto/miniapp-tenant.dto';
import { MiniappLocationDto } from './dto/miniapp-location.dto';
import {
  CreateMiniappPostDto,
  QueryMiniappPostDto,
  UpdateMiniappPostStatusDto,
} from './dto/miniapp-post.dto';
import { MiniappBannerService } from './miniapp-banner.service';
import { MiniappCategoryService } from './miniapp-category.service';
import { MiniappPostService } from './miniapp-post.service';
import { MiniappYellowPageService } from './miniapp-yellow-page.service';
import { OrderService } from '../order/order.service';
import { CreateMiniappOrderDto } from '../order/dto/create-miniapp-order.dto';
import {
  BindCurrentMiniappMemberPhoneDto,
  QueryMiniappMemberDto,
  UpdateCurrentMiniappMemberProfileDto,
  UpdateMiniappMemberAuthorizationDto,
  UpdateMiniappMemberRemarkDto,
  UpdateMiniappMemberStatusDto,
} from './dto/query-miniapp-member.dto';

@ApiTags('小程序 API 边界')
@Controller('miniapp')
export class MiniappApiController {
  constructor(
    private readonly miniappService: MiniappService,
    private readonly categoryService: MiniappCategoryService,
    private readonly postService: MiniappPostService,
    private readonly bannerService: MiniappBannerService,
    private readonly yellowPageService: MiniappYellowPageService,
    private readonly orderService: OrderService,
  ) {}

  @Get('meta')
  @Public()
  @ApiOperation({ summary: '小程序 API 边界信息' })
  getMeta() {
    return {
      type: 'miniapp',
      client: 'myapp',
      auth: 'miniapp-session',
      tenantSource: 'none',
      basePath: '/api/miniapp',
      status: 'ready',
    };
  }

  @Post('auth/login')
  @Public()
  @RateLimit({
    keyPrefix: 'miniapp-login',
    points: 20,
    durationSeconds: 60,
    keyFields: ['code', 'platform'],
  })
  @ApiOperation({ summary: '小程序静默登录' })
  silentLogin(@Body() dto: MiniappSilentLoginDto, @Req() req) {
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.socket?.remoteAddress;
    return this.miniappService.silentLogin(dto, clientIp);
  }

  @Get('auth/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前小程序会员信息' })
  getCurrentMember(@Req() req) {
    return this.miniappService.getCurrentMember(req.user.memberId || req.user.sub);
  }

  @Post('auth/profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改当前小程序会员头像昵称' })
  updateCurrentProfile(@Req() req, @Body() dto: UpdateCurrentMiniappMemberProfileDto) {
    return this.miniappService.updateCurrentMemberProfile(req.user.memberId || req.user.sub, dto);
  }

  @Post('auth/phone')
  @ApiBearerAuth()
  @ApiOperation({ summary: '绑定当前小程序会员手机号' })
  bindCurrentPhone(@Req() req, @Body() dto: BindCurrentMiniappMemberPhoneDto) {
    return this.miniappService.bindCurrentMemberPhone(req.user.memberId || req.user.sub, dto);
  }

  @Post('tenants/apply')
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序企业认证申请' })
  applyTenant(@Req() req, @Body() dto: ApplyMiniappTenantDto) {
    return this.miniappService.applyTenant(req.user.memberId || req.user.sub, dto);
  }

  @Get('tenants/my')
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询当前小程序企业认证信息' })
  getMyTenant(@Req() req) {
    return this.miniappService.getMyTenant(req.user.memberId || req.user.sub);
  }

  @Post('location')
  @Public()
  @RateLimit({ keyPrefix: 'miniapp-location', points: 30, durationSeconds: 60 })
  @ApiOperation({ summary: '小程序根据经纬度获取地址信息' })
  getLocation(@Body() dto: MiniappLocationDto, @Req() req) {
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.socket?.remoteAddress;
    return this.miniappService.getLocation(dto, clientIp);
  }

  @Get('categories')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序分类管理 - 分页列表' })
  findCategories(@Query() query: QueryMiniappCategoryDto) {
    return this.categoryService.findPage(query);
  }

  @Post('categories/save')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序分类管理 - 保存分类' })
  saveCategory(@Body() dto: SaveMiniappCategoryDto) {
    return this.categoryService.save(dto);
  }

  @Post('categories/:id/status')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序分类管理 - 修改状态' })
  updateCategoryStatus(@Param('id') id: string, @Body() dto: UpdateMiniappCategoryStatusDto) {
    return this.categoryService.updateStatus(id, dto.isActive);
  }

  @Post('categories/:id/delete')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序分类管理 - 删除分类' })
  removeCategory(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  @Post('categories/list')
  @Public()
  @ApiOperation({ summary: '小程序首页分类列表' })
  findActiveCategories() {
    return this.categoryService.findActiveList();
  }

  @Get('banners')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序轮播图管理 - 分页列表' })
  findBanners(@Query() query: QueryMiniappBannerDto) {
    return this.bannerService.findPage(query);
  }

  @Post('banners/save')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序轮播图管理 - 保存轮播图' })
  saveBanner(@Body() dto: SaveMiniappBannerDto) {
    return this.bannerService.save(dto);
  }

  @Post('banners/:id/status')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序轮播图管理 - 修改状态' })
  updateBannerStatus(@Param('id') id: string, @Body() dto: UpdateMiniappBannerStatusDto) {
    return this.bannerService.updateStatus(id, dto.isActive);
  }

  @Post('banners/:id/delete')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序轮播图管理 - 删除轮播图' })
  removeBanner(@Param('id') id: string) {
    return this.bannerService.remove(id);
  }

  @Post('banners/list')
  @Public()
  @ApiOperation({ summary: '小程序首页轮播图列表' })
  findActiveBanners() {
    return this.bannerService.findActiveList();
  }

  @Post('yellow-pages/list')
  @Public()
  @RateLimit({
    keyPrefix: 'miniapp-yellow-pages',
    points: 60,
    durationSeconds: 60,
    keyFields: ['keyword'],
  })
  @ApiOperation({ summary: '小程序企业黄页列表' })
  findYellowPages(
    @Body() query: { page?: number; pageNo?: number; pageSize?: number; keyword?: string },
  ) {
    return this.yellowPageService.findPage(query || {});
  }

  @Get('yellow-pages/:tenantId/products/:productId')
  @Public()
  @ApiOperation({ summary: '小程序企业黄页产品详情' })
  getYellowPageProductDetail(
    @Param('tenantId') tenantId: string,
    @Param('productId') productId: string,
  ) {
    return this.yellowPageService.getProductDetail(tenantId, productId);
  }

  @Post('orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序提交产品订购单' })
  createOrder(@Req() req, @Body() dto: CreateMiniappOrderDto) {
    return this.orderService.createMiniappOrder(dto, req.user.memberId || req.user.sub);
  }

  @Get('orders/my')
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序我的订购单列表' })
  findMyOrders(@Req() req, @Query() query: any) {
    return this.orderService.findMiniappOrders(req.user.memberId || req.user.sub, query);
  }

  @Get('orders/my/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序我的订购单详情' })
  findMyOrderDetail(@Req() req, @Param('id') id: string) {
    return this.orderService.findMiniappOrderDetail(req.user.memberId || req.user.sub, id);
  }

  @Post('orders/my/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序取消我的待确认订购单' })
  cancelMyOrder(@Req() req, @Param('id') id: string) {
    return this.orderService.cancelMiniappOrder(req.user.memberId || req.user.sub, id);
  }

  @Get('yellow-pages/:id')
  @Public()
  @ApiOperation({ summary: '小程序企业黄页详情' })
  getYellowPageDetail(@Param('id') id: string) {
    return this.yellowPageService.getDetail(id);
  }

  @Post('posts')
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序发布信息' })
  createPost(@Req() req, @Body() dto: CreateMiniappPostDto) {
    return this.postService.create(dto, req.user?.memberId || req.user?.sub);
  }

  @Get('posts/list')
  @Public()
  @RateLimit({
    keyPrefix: 'miniapp-posts-list',
    points: 60,
    durationSeconds: 60,
    keyFields: ['keyword', 'categoryId'],
  })
  @ApiOperation({ summary: '小程序信息列表' })
  findPosts(@Query() query: QueryMiniappPostDto) {
    return this.postService.findPublicPage(query);
  }

  @Post('posts/list')
  @Public()
  @RateLimit({
    keyPrefix: 'miniapp-posts-list',
    points: 60,
    durationSeconds: 60,
    keyFields: ['keyword', 'categoryId'],
  })
  @ApiOperation({ summary: '小程序信息列表' })
  findPostsByPost(@Body() query: QueryMiniappPostDto) {
    return this.postService.findPublicPage(query);
  }

  @Get('posts/admin/list')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序信息管理 - 分页列表' })
  findPostsForAdmin(@Query() query: QueryMiniappPostDto) {
    return this.postService.findAdminPage(query);
  }

  @Post('posts/admin/list')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序信息管理 - 分页列表' })
  findPostsForAdminByPost(@Body() query: QueryMiniappPostDto) {
    return this.postService.findAdminPage(query);
  }

  @Get('posts/admin/:id')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序信息管理 - 详情' })
  getPostDetailForAdmin(@Param('id') id: string) {
    return this.postService.getAdminDetail(id);
  }

  @Post('posts/:id/status')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '小程序信息管理 - 修改审核状态' })
  updatePostStatus(@Req() req, @Param('id') id: string, @Body() dto: UpdateMiniappPostStatusDto) {
    const clientIp =
      req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.ip || req?.socket?.remoteAddress;
    return this.postService.updateStatus(id, dto, {
      ...req.user,
      ip: clientIp,
      sourceType: req?.headers?.['x-source-type'] || null,
    });
  }

  @Post('posts/:id/resubmit')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改并重新提交我的发布' })
  resubmitMyPost(@Req() req, @Param('id') id: string, @Body() dto: CreateMiniappPostDto) {
    return this.postService.resubmitMine(id, dto, req.user?.memberId || req.user?.sub);
  }

  @Get('posts/my/list')
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的发布列表' })
  findMyPosts(@Req() req, @Query() query: QueryMiniappPostDto) {
    return this.postService.findMyPage(query, req.user?.memberId || req.user?.sub);
  }

  @Post('posts/my/list')
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的发布列表' })
  findMyPostsByPost(@Req() req, @Body() query: QueryMiniappPostDto) {
    return this.postService.findMyPage(query, req.user?.memberId || req.user?.sub);
  }

  @Get('posts/my/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的发布详情' })
  getMyPostDetail(@Req() req, @Param('id') id: string) {
    return this.postService.getMyDetail(id, req.user?.memberId || req.user?.sub);
  }

  @Post('posts/:id/delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除我的发布' })
  removeMyPost(@Req() req, @Param('id') id: string) {
    return this.postService.removeMine(id, req.user?.memberId || req.user?.sub);
  }

  @Post('posts/:id/collect')
  @ApiBearerAuth()
  @ApiOperation({ summary: '收藏信息' })
  collectPost(@Req() req, @Param('id') id: string) {
    return this.postService.addCollect(id, req.user?.memberId || req.user?.sub);
  }

  @Post('posts/:id/cancelCollect')
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消收藏信息' })
  cancelCollectPost(@Req() req, @Param('id') id: string) {
    return this.postService.cancelCollect(id, req.user?.memberId || req.user?.sub);
  }

  @Get('posts/collect/list')
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的收藏列表' })
  findCollectPosts(@Req() req, @Query() query: QueryMiniappPostDto) {
    return this.postService.findCollectPage(query, req.user?.memberId || req.user?.sub);
  }

  @Post('posts/collect/list')
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的收藏列表' })
  findCollectPostsByPost(@Req() req, @Body() query: QueryMiniappPostDto) {
    return this.postService.findCollectPage(query, req.user?.memberId || req.user?.sub);
  }

  @Get('posts/:id')
  @Public()
  @ApiOperation({ summary: '小程序信息详情' })
  getPostDetail(
    @Param('id') id: string,
    @Query('memberId') memberId?: string,
    @Query('increaseView') increaseView?: string,
    @Req() req?: any,
  ) {
    const clientIp =
      req?.headers?.['x-forwarded-for']?.split(',')[0] || req?.ip || req?.socket?.remoteAddress;
    return this.postService.getDetail(id, memberId, increaseView === '1', {
      ip: clientIp,
      userAgent: req?.headers?.['user-agent'] || null,
    });
  }

  @Get('members')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '会员列表' })
  findMembers(@Query() query: QueryMiniappMemberDto) {
    return this.miniappService.findMembers(query);
  }

  @Get('members/:id')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '会员详情' })
  getMemberDetail(@Param('id') id: string) {
    return this.miniappService.getMemberDetail(id);
  }

  @Post('members/:id/status')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改会员状态' })
  updateMemberStatus(@Param('id') id: string, @Body() dto: UpdateMiniappMemberStatusDto) {
    return this.miniappService.updateMemberStatus(id, dto);
  }

  @Post('members/updateAuthorization')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改当前会员隐私协议授权状态' })
  updateAuthorization(@Req() req, @Body() dto: UpdateMiniappMemberAuthorizationDto) {
    // 会员端接口：只允许修改“当前登录会员”自己的授权状态，memberId 取自 token，
    // 不信任 body 里的 id，避免越权篡改他人授权。
    return this.miniappService.updateMemberAuthorization(
      req.user?.memberId || req.user?.sub,
      dto,
    );
  }

  @Post('members/:id/remark')
  @UseGuards(PlatformAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '保存会员备注' })
  updateMemberRemark(@Param('id') id: string, @Body() dto: UpdateMiniappMemberRemarkDto) {
    return this.miniappService.updateMemberRemark(id, dto);
  }
}
