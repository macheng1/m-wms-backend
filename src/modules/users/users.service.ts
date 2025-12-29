// src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * 获取当前登录用户的完整画像
   * 包含：基本信息、所属租户、角色列表、去重后的权限代码
   */
  async getProfile(userId: string) {
    // 1. 核心查询：通过关系映射 (Relations) 一次性抓取角色及其关联权限
    // 这样可以避免 N+1 查询问题，提高 API 响应速度
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions', 'tenant'], // 同时也拉出租户详情
    });

    if (!user) {
      throw new NotFoundException('该用户不存在或已被删除');
    }

    // 2. 权限扁平化处理逻辑
    let permissions: string[] = [];

    /**
     * 权限判定优先级：
     * A. 如果是平台级超级管理员 (isPlatformAdmin) -> 拥有全平台上帝权限
     * B. 如果角色中包含 'ADMIN' (租户级管理员) -> 拥有本工厂所有权限
     */
    const isTenantAdmin = user.roles.some((r) => r.code === 'ADMIN');

    if (user.isPlatformAdmin || isTenantAdmin) {
      // 返回通配符，告知前端飞冰无需校验，直接开启所有功能按钮
      permissions = ['*'];
    } else {
      // 普通员工：提取所有角色下的权限 code 并合并
      permissions = user.roles.flatMap((role) => role.permissions.map((p) => p.code));
    }

    // 3. 构造标准化返回对象
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar || '', // 预留头像字段
      isPlatformAdmin: user.isPlatformAdmin,
      tenantId: user.tenantId,
      // 租户简要信息，方便前端显示在右上角，如：“当前工厂：泰州兴华电热”
      tenantName: user.tenant?.name || '系统运营方',
      // 去重处理，防止一个权限在多个角色中重复出现导致数据冗余
      permissions: [...new Set(permissions)],
    };
  }

  /**
   * 辅助方法：通过 ID 查找基础用户信息
   * 常用于其他 Service 内部逻辑调用
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }
}
