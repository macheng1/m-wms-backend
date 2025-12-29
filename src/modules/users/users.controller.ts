import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 获取当前登录用户的详细信息及权限
   * 修改后的接口路径: GET /api/users/getUserInfo
   */
  @Get('getUserInfo') // 路径从 'me' 改为 'getUserInfo'
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '通过 Token 识别身份，返回用户画像、所属租户及权限 Code 列表',
  })
  @ApiResponse({ status: 200, description: '成功返回用户信息' })
  @ApiResponse({ status: 401, description: 'Token 无效或已过期' })
  async getUserInfo(@Req() req) {
    // 方法名同步改为 getUserInfo
    // 从 JwtAuthGuard 挂载到 req.user 的 payload 中提取 userId
    const userId = req.user.userId;
    return await this.usersService.getProfile(userId);
  }
}
