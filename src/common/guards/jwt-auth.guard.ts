// src/modules/auth/guards/jwt-auth.guard.ts
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 认证守卫
 * 继承自 passport-jwt 的 AuthGuard，策略名称默认为 'jwt'
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * 验证逻辑入口
   */
  canActivate(context: ExecutionContext) {
    // 这里可以添加一些自定义逻辑，比如：
    // 如果是开发环境且带了特定的万能密钥，可以直接放行（慎用）
    return super.canActivate(context);
  }

  /**
   * 身份验证完成后的回调
   * @param err 错误信息
   * @param user JwtStrategy 中 validate 方法返回的用户对象
   * @param info 错误详情（如 Token 过期等）
   */
  handleRequest(err: any, user: any, info: any) {
    console.log('🚀 ~ JwtAuthGuard ~ handleRequest ~ info:', info);
    // 1. 如果有错误或者找不到用户（Token 无效/过期）
    if (err || !user) {
      throw err || new UnauthorizedException('登录状态已失效，请重新登录');
    }

    // 2. 检查用户是否被禁用 (对应我们之前在 User 实体里加的 isActive)
    if (user.isActive === false) {
      throw new UnauthorizedException('您的账号已被禁用，请联系管理员');
    }

    // 3. 验证通过，返回 user 对象，它会被 NestJS 挂载到 Request.user 上
    return user;
  }
}
