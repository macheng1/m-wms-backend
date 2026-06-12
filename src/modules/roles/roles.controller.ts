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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateRoleDto, UpdateRoleDto } from './entities/dto/create-role.dto';
import { RolesService } from './roles.service';
import { QueryRoleDto } from './entities/dto/query-role.dto';
import { UpdateRoleStatusDto } from './entities/dto/update-role-status.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationLog } from '../admin/entities/operation-log.entity';

@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard) // 之前全局注册了也可以不写，但这里显式声明更清晰
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    @InjectRepository(OperationLog)
    private readonly operationLogRepo: Repository<OperationLog>,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建角色' })
  create(@Body() createRoleDto: CreateRoleDto, @Req() req) {
    // 从 JWT 解析出的 user 对象中拿到租户 ID
    const { tenantId } = req.user;
    return this.rolesService.create(createRoleDto, tenantId).then(async (role) => {
      await this.recordTenantAudit(
        req,
        'role',
        'create',
        role?.id,
        `创建角色：${role?.name || createRoleDto.name}`,
      );
      return role;
    });
  }

  @Get('page')
  @ApiOperation({ summary: '分页查询角色列表' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async findPage(@Query() query: QueryRoleDto, @Req() req) {
    return this.rolesService.findAll(query, req.user.tenantId);
  }

  @Get('options')
  @ApiOperation({ summary: '查询角色下拉选项' })
  async options(@Req() req) {
    return this.rolesService.selectRoleList(req.user.tenantId);
  }

  @Get('menus/tree')
  @ApiOperation({ summary: '查询当前租户可授权菜单树' })
  async menuTree(@Req() req) {
    return this.rolesService.getMenuTree(req.user.tenantId);
  }

  @Post('save')
  @ApiOperation({ summary: '保存角色' })
  async save(@Body() dto: UpdateRoleDto & { id?: string }, @Req() req) {
    const role = await this.rolesService.save(dto, req.user.tenantId);
    await this.recordTenantAudit(
      req,
      'role',
      dto.id ? 'update' : 'create',
      role?.id,
      `保存角色：${role?.name || dto.name}`,
    );
    return role;
  }

  @Post('delete')
  @ApiOperation({ summary: '删除角色' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string', description: '角色ID' } },
    },
  })
  async deleteByBody(@Body('id') id: string, @Req() req) {
    const result = await this.rolesService.remove(id, req.user.tenantId);
    await this.recordTenantAudit(req, 'role', 'delete', id, '删除角色');
    return result;
  }

  // 1. 分页查找所有角色
  @Get()
  @ApiOperation({ summary: '查询角色列表' })
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async findAll(@Query() query: QueryRoleDto, @Req() req) {
    return this.rolesService.findAll(query, req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询角色详情' })
  findOne(@Param('id') id: string, @Req() req) {
    return this.rolesService.findOne(id, req.user.tenantId);
  }

  @Post(':id/update')
  @ApiOperation({ summary: '更新角色' })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto, @Req() req) {
    const role = await this.rolesService.update(id, updateRoleDto, req.user.tenantId);
    await this.recordTenantAudit(
      req,
      'role',
      'update',
      id,
      `更新角色：${role?.name || updateRoleDto.name || id}`,
    );
    return role;
  }
  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  async remove(@Param('id') id: string, @Req() req) {
    const result = await this.rolesService.remove(id, req.user.tenantId);
    await this.recordTenantAudit(req, 'role', 'delete', id, '删除角色');
    return result;
  }
  @Post(':id/status')
  @ApiOperation({ summary: '切换角色状态' })
  async updateStatus(@Param('id') id: string, @Body() statusDto: UpdateRoleStatusDto, @Req() req) {
    // 从 req.user 中安全获取当前操作厂家的 tenantId
    const { tenantId } = req.user;
    const result = await this.rolesService.updateStatus(id, statusDto.isActive, tenantId);
    await this.recordTenantAudit(req, 'role', 'status', id, `切换角色状态：${statusDto.isActive}`);
    return result;
  }
  // 查询所有激活的角色（不分页，select 用）
  /**
   * 查询所有激活的角色（不分页，select 用）
   * GET /roles/selectRoleLists
   */
  @Post('selectRoleLists')
  @ApiOperation({ summary: '查询启用角色列表' })
  async getActiveRoleList(@Req() req) {
    // 返回当前租户下所有启用状态的角色列表
    return this.rolesService.selectRoleList(req.user.tenantId);
  }

  private recordTenantAudit(
    req: any,
    module: string,
    action: string,
    targetId?: string,
    description?: string,
  ) {
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
