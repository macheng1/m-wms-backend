import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { MiniappService } from './miniapp.service';
import { MiniappSilentLoginDto } from './dto/miniapp-auth.dto';
import {
  QueryMiniappMemberDto,
  UpdateMiniappMemberAuthorizationDto,
  UpdateMiniappMemberRemarkDto,
  UpdateMiniappMemberStatusDto,
} from './dto/query-miniapp-member.dto';

@ApiTags('小程序 API 边界')
@Controller('miniapp')
export class MiniappApiController {
  constructor(private readonly miniappService: MiniappService) {}

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

  @Get('members')
  @ApiBearerAuth()
  @ApiOperation({ summary: '会员列表' })
  findMembers(@Query() query: QueryMiniappMemberDto) {
    return this.miniappService.findMembers(query);
  }

  @Get('members/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '会员详情' })
  getMemberDetail(@Param('id') id: string) {
    return this.miniappService.getMemberDetail(id);
  }

  @Post('members/:id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改会员状态' })
  updateMemberStatus(@Param('id') id: string, @Body() dto: UpdateMiniappMemberStatusDto) {
    return this.miniappService.updateMemberStatus(id, dto);
  }

  @Post('members/updateAuthorization')
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改会员隐私协议授权状态' })
  updateAuthorization(@Body() dto: UpdateMiniappMemberAuthorizationDto) {
    return this.miniappService.updateMemberAuthorization(dto);
  }

  @Post('members/:id/remark')
  @ApiBearerAuth()
  @ApiOperation({ summary: '保存会员备注' })
  updateMemberRemark(@Param('id') id: string, @Body() dto: UpdateMiniappMemberRemarkDto) {
    return this.miniappService.updateMemberRemark(id, dto);
  }
}
