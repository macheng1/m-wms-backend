import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '@/common/guards/platform-admin.guard';
import { TenantsService } from '../tenant/tenants.service';
import { AdminPlatformService } from './admin-platform.service';
import { CategoriesService } from '../product/service/categories.service';
import { AttributesService } from '../product/service/attributes.service';
import { UnitService } from '../unit/unit.service';

@ApiTags('管理端 API 边界')
@ApiBearerAuth()
@Controller('admin')
export class AdminApiController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly adminPlatformService: AdminPlatformService,
    private readonly categoriesService: CategoriesService,
    private readonly attributesService: AttributesService,
    private readonly unitService: UnitService,
  ) {}

  @Get('meta')
  @ApiOperation({ summary: '管理端 API 边界信息' })
  getMeta() {
    return {
      type: 'admin',
      client: 'my-wms',
      auth: 'jwt',
      tenantSource: 'jwt',
      basePath: '/api/admin',
      status: 'skeleton',
    };
  }

  @Get('platform/meta')
  @ApiOperation({ summary: '管理端平台域 API 边界信息' })
  getPlatformMeta() {
    return {
      type: 'admin-platform',
      client: 'my-wms',
      auth: 'jwt',
      tenantSource: 'platform-context',
      basePath: '/api/admin/platform',
      actors: ['platform-super-admin'],
      responsibilities: ['租户管理', '平台菜单', '平台角色', '平台用户', '平台配置'],
      status: 'skeleton',
    };
  }

  @Get('tenant/meta')
  @ApiOperation({ summary: '管理端租户域 API 边界信息' })
  getTenantMeta() {
    return {
      type: 'admin-tenant',
      client: 'my-wms',
      auth: 'jwt',
      tenantSource: 'jwt',
      basePath: '/api/admin/tenant',
      actors: ['tenant-admin', 'tenant-staff'],
      responsibilities: ['租户员工', '租户角色', '租户菜单', '租户业务数据'],
      status: 'skeleton',
    };
  }

  @Get('tenant/menus')
  @ApiOperation({ summary: '管理端租户域 - 当前租户已授权菜单' })
  getCurrentTenantMenus(@Req() req) {
    return this.adminPlatformService.findCurrentTenantMenuGrant(req.user.tenantId);
  }

  @Get('tenant/dashboard')
  @ApiOperation({ summary: '管理端租户域 - 当前租户看板' })
  getTenantDashboard(@Req() req) {
    return this.adminPlatformService.tenantDashboard(req.user.tenantId);
  }

  @Get('tenant/profile')
  @ApiOperation({ summary: '管理端租户域 - 当前租户资料' })
  getTenantProfile(@Req() req) {
    return this.tenantsService.findOne(req.user.tenantId);
  }

  @Post('tenant/profile/save')
  @ApiOperation({ summary: '管理端租户域 - 保存当前租户资料' })
  saveTenantProfile(@Req() req, @Body() body: any) {
    return this.tenantsService.update(req.user.tenantId, body).then(async (tenant) => {
      await this.adminPlatformService.recordAudit({
        user: req.user,
        scope: 'tenant',
        module: 'tenant-profile',
        action: 'save',
        targetType: 'tenant',
        targetId: req.user.tenantId,
        description: '保存租户企业资料',
        afterData: body,
        ip: req.ip,
      });
      return tenant;
    });
  }

  @Post('tenant/audit-logs')
  @ApiOperation({ summary: '管理端租户域 - 当前租户操作日志' })
  getTenantAuditLogs(
    @Req() req,
    @Body() body: { page?: number; pageSize?: number; module?: string; username?: string },
  ) {
    return this.adminPlatformService.findAuditLogs({
      ...body,
      scope: 'tenant',
      tenantId: req.user.tenantId,
    });
  }

  @Get('platform/dashboard')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 平台数据看板' })
  getPlatformDashboard() {
    return this.adminPlatformService.platformDashboard();
  }

  @Get('platform/tenants')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 租户列表' })
  getPlatformTenants() {
    return this.tenantsService.findAll({ page: 1, pageSize: 100 });
  }

  @Get('platform/tenant-menus')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 租户统一菜单池' })
  getTenantMenus() {
    return this.adminPlatformService.findTenantMenus();
  }

  @Post('platform/tenants/list')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 租户分页列表' })
  listPlatformTenants(
    @Body()
    body: {
      page?: number;
      pageSize?: number;
      code?: string;
      name?: string;
      contactPerson?: string;
      contactPhone?: string;
      email?: string;
      tenantSource?: 'platform' | 'miniapp' | 'import' | 'api' | 'all';
      lifecycleStatus?: 'pending' | 'active' | 'rejected' | 'disabled' | 'expired';
      isActive?: number | string;
    },
  ) {
    const { page = 1, pageSize = 20, ...query } = body || {};
    return this.tenantsService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      ...query,
    });
  }

  @Get('platform/tenants/:id/menus')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 查询租户已授权菜单' })
  getTenantMenuGrant(@Param('id') id: string) {
    return this.adminPlatformService.findTenantMenuGrant(id);
  }

  @Post('platform/tenants/:id/menus/save')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 保存租户菜单授权' })
  saveTenantMenuGrant(@Param('id') id: string, @Body() body: { menuCodes?: string[] }, @Req() req) {
    return this.adminPlatformService
      .saveTenantMenuGrant(id, body?.menuCodes || [])
      .then(async (result) => {
        await this.adminPlatformService.recordAudit({
          user: req.user,
          scope: 'platform',
          module: 'tenant-menu',
          action: 'save',
          targetType: 'tenant',
          targetId: id,
          description: `保存租户菜单授权：${result.tenantName}`,
          afterData: { menuCodes: body?.menuCodes || [] },
          ip: req.ip,
        });
        return result;
      });
  }

  @Post('platform/tenants/:id/lifecycle')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 更新租户生命周期' })
  updateTenantLifecycle(@Param('id') id: string, @Body() body: any, @Req() req) {
    return this.adminPlatformService.updateTenantLifecycle(id, body).then(async (tenant) => {
      await this.adminPlatformService.recordAudit({
        user: req.user,
        scope: 'platform',
        module: 'tenant',
        action: 'lifecycle',
        targetType: 'tenant',
        targetId: id,
        description: `更新租户生命周期：${tenant.lifecycleStatus}`,
        afterData: tenant as any,
        ip: req.ip,
      });
      return tenant;
    });
  }

  @Get('platform/tenants/:id')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 租户详情' })
  getPlatformTenantDetail(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post('platform/tenants/:id/approve')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 审核通过租户' })
  approveTenant(@Param('id') id: string) {
    return this.tenantsService.approve(id);
  }

  @Post('platform/tenants/:id/reject')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 驳回并禁用租户' })
  rejectTenant(@Param('id') id: string, @Body() body: { auditRemark?: string }) {
    return this.tenantsService.reject(id, body?.auditRemark);
  }

  @Get('platform/menus/all')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 全量菜单列表' })
  getPlatformMenusAll() {
    return this.adminPlatformService.findAllMenus();
  }

  @Get('platform/menus')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 菜单列表' })
  getPlatformMenus() {
    return this.adminPlatformService.findMenus();
  }

  @Post('platform/menus/list')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 菜单分页列表' })
  listPlatformMenus(
    @Body()
    body: {
      page?: number;
      pageSize?: number;
      type?: 'DIRECTORY' | 'MENU' | 'BUTTON' | 'all';
      name?: string;
      code?: string;
      routePath?: string;
      isHidden?: number;
    },
  ) {
    return this.adminPlatformService.findMenusPage(body || {});
  }

  @Get('platform/menus/tree')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 菜单树' })
  getPlatformMenuTree() {
    return this.adminPlatformService.findMenuTree();
  }

  @Get('platform/menus/:id')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 菜单详情' })
  getPlatformMenuDetail(@Param('id') id: string) {
    return this.adminPlatformService.findMenuDetail(Number(id));
  }

  @Get('platform/roles')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 角色列表' })
  getPlatformRoles() {
    return this.adminPlatformService.findRoles();
  }

  @Post('platform/roles/save')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 保存平台角色' })
  savePlatformRole(
    @Body()
    dto: {
      id?: string;
      name: string;
      code?: string;
      remark?: string;
      isActive?: number;
      menuCodes?: string[];
      menuIds?: number[];
      dataScope?: 'ALL' | 'CUSTOM' | 'DEPT' | 'DEPT_AND_CHILD' | 'SELF';
      deptIds?: string[];
    },
    @Req() req,
  ) {
    return this.adminPlatformService.saveRole(dto).then(async (role) => {
      await this.adminPlatformService.recordAudit({
        user: req.user,
        scope: 'platform',
        module: 'platform-role',
        action: 'save',
        targetType: 'role',
        targetId: role.id,
        description: `保存平台角色：${role.name}`,
        afterData: role as any,
        ip: req.ip,
      });
      return role;
    });
  }

  @Post('platform/roles/:id/delete')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 删除平台角色' })
  deletePlatformRole(@Param('id') id: string, @Req() req) {
    return this.adminPlatformService.deleteRole(id).then(async (role) => {
      await this.adminPlatformService.recordAudit({
        user: req.user,
        scope: 'platform',
        module: 'platform-role',
        action: 'delete',
        targetType: 'role',
        targetId: role.id,
        description: `删除平台角色：${role.name}`,
        beforeData: role,
        ip: req.ip,
      });
      return role;
    });
  }

  @Post('platform/users/list')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 平台用户分页列表' })
  listPlatformUsers(
    @Body() body: { page?: number; pageSize?: number; username?: string; isActive?: number },
  ) {
    return this.adminPlatformService.findUsers(body || {});
  }

  @Get('platform/users/:id')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 平台用户详情' })
  getPlatformUserDetail(@Param('id') id: string) {
    return this.adminPlatformService.findUserDetail(id);
  }

  @Post('platform/users/save')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 保存平台用户' })
  savePlatformUser(
    @Body()
    dto: {
      id?: string;
      username: string;
      password?: string;
      realName?: string;
      phone?: string;
      email?: string;
      avatar?: string;
      deptId?: string | null;
      postId?: string | null;
      isActive?: number;
      roleIds?: string[];
    },
    @Req() req,
  ) {
    return this.adminPlatformService.saveUser(dto).then(async (user) => {
      await this.adminPlatformService.recordAudit({
        user: req.user,
        scope: 'platform',
        module: 'platform-user',
        action: 'save',
        targetType: 'user',
        targetId: user.id,
        description: `保存平台用户：${user.username}`,
        afterData: { id: user.id, username: user.username, isActive: user.isActive },
        ip: req.ip,
      });
      return user;
    });
  }

  @Post('platform/users/:id/status')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 平台用户状态变更' })
  updatePlatformUserStatus(@Param('id') id: string, @Body() body: { isActive: number }) {
    return this.adminPlatformService.updateUserStatus(id, body.isActive);
  }

  @Post('platform/users/:id/delete')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 删除平台用户' })
  deletePlatformUser(@Param('id') id: string, @Req() req) {
    return this.adminPlatformService.deleteUser(id, req.user?.id).then(async (user) => {
      await this.adminPlatformService.recordAudit({
        user: req.user,
        scope: 'platform',
        module: 'platform-user',
        action: 'delete',
        targetType: 'user',
        targetId: user.id,
        description: `删除平台用户：${user.username}`,
        beforeData: user,
        ip: req.ip,
      });
      return user;
    });
  }

  @Post('platform/menus/save')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 保存平台菜单' })
  savePlatformMenu(
    @Body()
    dto: {
      id?: number;
      type?: 'DIRECTORY' | 'MENU' | 'BUTTON';
      code: string;
      name: string;
      routePath?: string | null;
      componentPath?: string | null;
      description?: string | null;
      parentId?: number;
      icon?: string | null;
      sortOrder?: number;
      isHidden?: number;
      isActive?: number;
    },
    @Req() req,
  ) {
    return this.adminPlatformService.saveMenu(dto).then(async (menu) => {
      await this.adminPlatformService.recordAudit({
        user: req.user,
        scope: 'platform',
        module: 'platform-menu',
        action: 'save',
        targetType: 'menu',
        targetId: String(menu.id),
        description: `保存平台菜单：${menu.name}`,
        afterData: menu as any,
        ip: req.ip,
      });
      return menu;
    });
  }

  @Post('platform/audit-logs')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 平台操作审计日志' })
  getPlatformAuditLogs(
    @Body() body: { page?: number; pageSize?: number; module?: string; username?: string },
  ) {
    return this.adminPlatformService.findAuditLogs({ ...body, scope: 'platform' });
  }

  @Post('platform/templates/categories/list')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 标准类目模板分页列表' })
  listPlatformCategoryTemplates(@Body() body: any) {
    return this.categoriesService.findPage(body || {}, null);
  }

  @Get('platform/templates/categories/:id')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 标准类目模板详情' })
  getPlatformCategoryTemplate(@Param('id') id: string) {
    return this.categoriesService.getDetail(id, null);
  }

  @Post('platform/templates/categories/save')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 保存标准类目模板' })
  savePlatformCategoryTemplate(@Body() body: any) {
    return body?.id
      ? this.categoriesService.update(body, null)
      : this.categoriesService.save(body, null);
  }

  @Post('platform/templates/categories/:id/status')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 标准类目模板状态变更' })
  updatePlatformCategoryTemplateStatus(
    @Param('id') id: string,
    @Body() body: { isActive: number },
  ) {
    return this.categoriesService.updateStatus(id, body.isActive, null);
  }

  @Post('platform/templates/categories/:id/delete')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 删除标准类目模板' })
  deletePlatformCategoryTemplate(@Param('id') id: string) {
    return this.categoriesService.delete(id, null);
  }

  @Post('platform/templates/attributes/list')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 标准属性模板分页列表' })
  listPlatformAttributeTemplates(@Body() body: any) {
    return this.attributesService.findPage(body || {}, null);
  }

  @Get('platform/templates/attributes/:id')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 标准属性模板详情' })
  getPlatformAttributeTemplate(@Param('id') id: string) {
    return this.attributesService.getDetail(id, null);
  }

  @Post('platform/templates/attributes/save')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 保存标准属性模板' })
  savePlatformAttributeTemplate(@Body() body: any) {
    return body?.id
      ? this.attributesService.update(body, null)
      : this.attributesService.save(body, null);
  }

  @Post('platform/templates/attributes/:id/status')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 标准属性模板状态变更' })
  updatePlatformAttributeTemplateStatus(
    @Param('id') id: string,
    @Body() body: { isActive: number },
  ) {
    return this.attributesService.updateStatus(id, body.isActive, null);
  }

  @Post('platform/templates/attributes/:id/delete')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 删除标准属性模板' })
  deletePlatformAttributeTemplate(@Param('id') id: string) {
    return this.attributesService.delete(id, null);
  }

  @Post('platform/templates/units/list')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 标准单位模板分页列表' })
  listPlatformUnitTemplates(@Body() body: any) {
    return this.unitService.findPage(body || {}, null);
  }

  @Get('platform/templates/units/active')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 启用的标准单位模板' })
  getActivePlatformUnitTemplates() {
    return this.unitService.findActive(null);
  }

  @Post('platform/templates/units/detail')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 标准单位模板详情' })
  getPlatformUnitTemplate(@Body() body: { id?: string; code?: string }) {
    if (body?.id) return this.unitService.findOne(body.id, null);
    if (body?.code) return this.unitService.findByCode(body.code, null);
    throw new BadRequestException('缺少单位ID或编码');
  }

  @Post('platform/templates/units/save')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 保存标准单位模板' })
  savePlatformUnitTemplate(@Body() body: any) {
    return body?.id
      ? this.unitService.update(body.id, body, null)
      : this.unitService.create(body, null);
  }

  @Post('platform/templates/units/:id/delete')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 删除标准单位模板' })
  deletePlatformUnitTemplate(@Param('id') id: string) {
    return this.unitService.remove(id, null);
  }

  @Post('platform/menus/:id/delete')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: '平台域 - 删除平台菜单' })
  deletePlatformMenu(@Param('id') id: string, @Req() req) {
    return this.adminPlatformService.deleteMenu(Number(id)).then(async (menu) => {
      await this.adminPlatformService.recordAudit({
        user: req.user,
        scope: 'platform',
        module: 'platform-menu',
        action: 'delete',
        targetType: 'menu',
        targetId: String(menu.id),
        description: `删除平台菜单：${menu.name}`,
        beforeData: menu,
        ip: req.ip,
      });
      return menu;
    });
  }
}
