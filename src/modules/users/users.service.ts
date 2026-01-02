// src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs'; // 修复导入，确保运行时可用
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { BusinessException } from '@/common/filters/business.exception';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ResetPasswordDto } from './dto/reset-password-dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 1. 获取当前登录用户自画像 (getUserInfo)
   */
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions', 'tenant'],
    });

    if (!user) throw new NotFoundException('该用户不存在');

    // 权限扁平化：如果是平台管理员或租户管理员，直接返回通配符
    const isTenantAdmin = user.roles.some((r) => r.code === 'ADMIN');
    const permissions =
      user.isPlatformAdmin || isTenantAdmin
        ? ['*']
        : user.roles.flatMap((role) => role.permissions.map((p) => p.code));

    // 新增：角色名称数组
    const roleNames = user.roles?.map((r) => r.name) || [];

    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      isPlatformAdmin: user.isPlatformAdmin,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name || '系统运营',
      permissions: [...new Set(permissions)], // 去重
      roleNames,
    };
  }

  /**
   * 2. 分页查找 (page) - 按创建时间正序
   */
  async findPage(query: QueryUserDto, tenantId: string) {
    const { page, pageSize, username } = query;
    const where: any = { tenantId };
    if (username) where.username = Like(`%${username}%`);

    const [list, total] = await this.userRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
      relations: ['roles'],
    });

    // 新增：为每个用户增加 roleNames 字段
    const listWithRoleNames = list.map((user) => ({
      ...user,
      roleNames: user.roles?.map((r) => r.name) || [],
    }));

    return { list: listWithRoleNames, total, page, pageSize };
  }

  /**
   * 3. 保存新员工 (save)
   */
  async save(dto: CreateUserDto, tenantId: string) {
    // 检查账号是否重复
    const existing = await this.userRepo.findOne({ where: { username: dto.username, tenantId } });
    if (existing) throw new BusinessException('用户名已存在');

    // 核心优化：保存前必须加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      ...dto,
      password: hashedPassword,
      tenantId,
    });

    if (dto.roleIds) user.roles = dto.roleIds.map((id) => ({ id }) as Role);

    return await this.userRepo.save(user);
  }

  /**
   * 4. 更新员工信息 (update)
   */
  async update(dto: UpdateUserDto, tenantId: string) {
    const user = await this.userRepo.findOne({
      where: { id: dto.id, tenantId },
      relations: ['roles'],
    });

    if (!user) throw new BusinessException('未找到该员工');

    // 如果涉及角色变更，重新映射多对多关系
    if (dto.roleIds) user.roles = dto.roleIds.map((id) => ({ id }) as Role);

    // 合并其他字段 (排除密码，密码有专门的重置接口)
    const { password, ...updateInfo } = dto;
    Object.assign(user, updateInfo);

    return await this.userRepo.save(user);
  }

  /**
   * 5. 账号状态一键切换 (status)
   */
  async status(dto: UpdateUserStatusDto, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { id: dto.id, tenantId } });
    if (!user) throw new BusinessException('员工不存在');

    user.isActive = dto.isActive;
    await this.userRepo.save(user);
    return { message: user.isActive ? '账号已启用' : '账号已禁用' };
  }

  /**
   * 6. 修改个人密码 (password)
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) throw new BusinessException('旧密码错误');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    return await this.userRepo.save(user);
  }

  /**
   * 7. 管理员重置他人密码 (reset)
   */
  async reset(dto: ResetPasswordDto, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId, tenantId } });
    if (!user) throw new BusinessException('员工不存在');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.save(user);
    return { message: '密码重置成功' };
  }

  /**
   * 8. 删除员工 (delete)
   */
  async delete(id: string, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new BusinessException('未找到该员工');

    // TypeORM 会自动清理关联表中的 user_roles 记录
    await this.userRepo.remove(user);
    return { message: '删除成功' };
  }
  /**
   * 获取指定员工详情（getDetail）
   */
  async getDetail(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions', 'tenant'],
    });
    if (!user) throw new NotFoundException('该员工不存在');

    const roleIds = user.roles?.map((r) => r.id) || [];
    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      isPlatformAdmin: user.isPlatformAdmin,
      tenantId: user.tenantId,
      tenantName: user.tenant?.name || '系统运营',
      isActive: user.isActive ? 1 : 0,
      roleIds,
    };
  }
}
