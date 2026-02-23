import { Body, Controller, Get, Header, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password-dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

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
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '通过 Token 识别身份，返回用户画像、所属租户及权限 Code 列表',
  })
  @ApiResponse({ status: 200, description: '成功返回用户信息' })
  @ApiResponse({ status: 401, description: 'Token 无效或已过期' })
  async getUserInfo(@Req() req) {
    // 方法名同步改为 getUserInfo
    // 从 JwtAuthGuard 挂载到 req.user 的 payload 中提取 userId
    const userId = req.user.sub;

    return await this.usersService.getProfile(userId);
  }
  /**
   * 1. 分页查找员工列表
   * GET /users/page
   */
  @Get('page')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async findPage(@Query() query: QueryUserDto, @Req() req) {
    return this.usersService.findPage(query, req.user.tenantId);
  }

  /**
   * 2. 新增员工保存
   * POST /users/save
   */
  @Post('save')
  @UseGuards(JwtAuthGuard)
  async save(@Body() createUserDto: CreateUserDto, @Req() req) {
    return this.usersService.save(createUserDto, req.user.tenantId);
  }

  /**
   * 3. 员工信息更新
   * POST /users/update
   */
  @Post('update')
  @UseGuards(JwtAuthGuard)
  async update(@Body() updateUserDto: UpdateUserDto, @Req() req) {
    return this.usersService.update(updateUserDto, req.user.tenantId);
  }

  /**
   * 4. 员工自主修改密码 (个人中心使用)
   * POST /users/password
   */
  @ApiOperation({ summary: '个人修改密码' })
  @Post('password')
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req) {
    // 从 Token 直接拿当前登录人的 sub (userId)
    return this.usersService.changePassword(req.user.sub, dto);
  }

  /**
   * 5. 管理员强制重置密码 (员工管理页面使用)
   * POST /users/reset
   */
  @ApiOperation({ summary: '管理员重置密码' })
  @Post('reset')
  @UseGuards(JwtAuthGuard)
  async reset(@Body() dto: ResetPasswordDto, @Req() req) {
    // 强制带上租户 ID，防止管理员重置了其他厂家的账号
    return this.usersService.reset(dto, req.user.tenantId);
  }

  /**
   * 6. 员工状态切换
   * POST /users/status
   */
  @Post('status')
  @UseGuards(JwtAuthGuard)
  async status(@Body() dto: UpdateUserStatusDto, @Req() req) {
    return this.usersService.status(dto, req.user.tenantId);
  }

  /**
   * 7. 删除员工
   * POST /users/delete
   */
  @Post('delete')
  @UseGuards(JwtAuthGuard)
  async delete(@Body('id') id: string, @Req() req) {
    return this.usersService.delete(id, req.user.tenantId);
  }
  /**
   * 获取指定员工详情
   * GET /users/:id
   */
  @Post('detail')
  @UseGuards(JwtAuthGuard)
  async getUserDetail(@Body('id') id: string) {
    return this.usersService.getDetail(id);
  }
}
