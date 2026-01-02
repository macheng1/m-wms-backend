import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateRoleDto, UpdateRoleDto } from './entities/dto/create-role.dto';
import { RolesService } from './roles.service';
import { QueryRoleDto } from './entities/dto/query-role.dto';
import { UpdateRoleStatusDto } from './entities/dto/update-role-status.dto';

@ApiTags('角色管理')
@Controller('roles')
@UseGuards(JwtAuthGuard) // 之前全局注册了也可以不写，但这里显式声明更清晰
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(@Body() createRoleDto: CreateRoleDto, @Req() req) {
    // 从 JWT 解析出的 user 对象中拿到租户 ID
    const { tenantId } = req.user;
    return this.rolesService.create(createRoleDto, tenantId);
  }

  // 1. 分页查找所有角色
  @Get()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findAll(@Query() query: QueryRoleDto, @Req() req) {
    return this.rolesService.findAll(query, req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.rolesService.findOne(id, req.user.tenantId);
  }

  @Post(':id/update')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto, @Req() req) {
    return this.rolesService.update(id, updateRoleDto, req.user.tenantId);
  }
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.rolesService.remove(id, req.user.tenantId);
  }
  @Post(':id/status')
  async updateStatus(@Param('id') id: string, @Body() statusDto: UpdateRoleStatusDto, @Req() req) {
    // 从 req.user 中安全获取当前操作厂家的 tenantId
    const { tenantId } = req.user;
    return this.rolesService.updateStatus(id, statusDto.isActive, tenantId);
  }
  // 查询所有激活的角色（不分页，select 用）
  /**
   * 查询所有激活的角色（不分页，select 用）
   * GET /roles/selectRoleLists
   */
  @Post('selectRoleLists')
  async getActiveRoleList(@Req() req) {
    // 返回当前租户下所有启用状态的角色列表
    return this.rolesService.selectRoleList(req.user.tenantId);
  }
}
