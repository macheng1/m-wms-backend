import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// src/common/guards/permission.guard.ts
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // src/common/guards/permission.guard.ts
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. 如果是平台超级管理员，直接放行所有接口
    if (user.isPlatformAdmin) return true;

    // 2. 如果是租户管理员（拥有 ADMIN 角色），也放行该租户下的所有接口
    const roles = user.roles?.map((r) => r.code);
    if (roles.includes('ADMIN')) return true;

    // 3. 普通员工则进行具体的权限 Code 比对
    const requiredPermission = this.reflector.get('permission', context.getHandler());
    return user.permissions.includes(requiredPermission);
  }
}
