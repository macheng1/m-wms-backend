import { Body, Controller, Get, Header, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password-dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from '../admin/entities/operation-log.entity';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(OperationLog)
    private readonly operationLogRepo: Repository<OperationLog>,
  ) {}

  /**
   * 获取当前登录用户的详细信息及权限
   * 修改后的接口路径: GET /api/users/getUserInfo
   */
  @Get('getUserInfo') // 路径从 'me' 改为 'getUserInfo'
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '通过 Token 识别身份，返回用户画像、所属租户及可见菜单树',
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
  async save(@Body() createUserDto: CreateUserDto & { id?: string }, @Req() req) {
    const result = await this.usersService.save(createUserDto, req.user.tenantId);
    await this.recordTenantAudit(req, 'user', 'save', result?.id, `保存员工：${result?.username || createUserDto.username}`);
    return result;
  }

  /**
   * 3. 员工信息更新
   * POST /users/update
   */
  @Post('update')
  @UseGuards(JwtAuthGuard)
  async update(@Body() updateUserDto: UpdateUserDto, @Req() req) {
    const result = await this.usersService.update(updateUserDto, req.user.tenantId);
    await this.recordTenantAudit(req, 'user', 'update', updateUserDto.id, `更新员工：${result?.username || updateUserDto.username || updateUserDto.id}`);
    return result;
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
    const result = await this.usersService.reset(dto, req.user.tenantId);
    await this.recordTenantAudit(req, 'user', 'reset-password', dto.userId, '重置员工密码');
    return result;
  }

  /**
   * 6. 员工状态切换
   * POST /users/status
   */
  @Post('status')
  @UseGuards(JwtAuthGuard)
  async status(@Body() dto: UpdateUserStatusDto, @Req() req) {
    const result = await this.usersService.status(dto, req.user.tenantId);
    await this.recordTenantAudit(req, 'user', 'status', dto.id, `切换员工状态：${dto.isActive}`);
    return result;
  }

  /**
   * 7. 删除员工
   * POST /users/delete
   */
  @Post('delete')
  @UseGuards(JwtAuthGuard)
  async delete(@Body('id') id: string, @Req() req) {
    const result = await this.usersService.delete(id, req.user.tenantId);
    await this.recordTenantAudit(req, 'user', 'delete', id, '删除员工');
    return result;
  }
  /**
   * 获取指定员工详情
   * GET /users/:id
   */
  @Post('detail')
  @UseGuards(JwtAuthGuard)
  async getUserDetail(@Body('id') id: string, @Req() req) {
    return this.usersService.getDetail(id, req.user.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserDetailById(@Param('id') id: string, @Req() req) {
    return this.usersService.getDetail(id, req.user.tenantId);
  }

  private recordTenantAudit(req: any, module: string, action: string, targetId?: string, description?: string) {
    return this.operationLogRepo.save(
      this.operationLogRepo.create({
        tenantId: req.user?.tenantId || null,
        userId: req.user?.userId || req.user?.sub || null,
        username: req.user?.username || null,
        scope: 'tenant',
        module,
        action,
        targetType: module,
        targetId: targetId || null,
        description: description || null,
        ip: req.ip || null,
      }),
    );
  }
}
