// src/modules/auth/guards/jwt-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core'; // 必须导入 Reflector
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { DataSource } from 'typeorm';
import { Tenant } from '@/modules/tenant/entities/tenant.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector, // 注入反射器
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 【核心优化】使用 Reflector 检查当前接口或类是否带有 @Public() 装饰器
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果是公开接口，直接绿灯放行
    if (isPublic) return true;

    // 2. 以下是原有的 JWT 校验逻辑...
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException('请先登录');

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('jwt.secret'),
      });
      console.log('🚀 ~ JwtAuthGuard ~ canActivate ~ payload:', payload);

      // 平台管理员跳过租户审核校验
      if (payload.userType !== 'platform' && payload.tenantId) {
        const tenant = await this.dataSource.getRepository(Tenant).findOne({
          where: { id: payload.tenantId },
        });

        if (!tenant) {
          throw new UnauthorizedException('租户不存在');
        }
        if (tenant.lifecycleStatus && tenant.lifecycleStatus !== 'active') {
          throw new ForbiddenException('租户未处于运营中状态，禁止访问');
        }
        if (tenant.isApproved !== 1) {
          throw new ForbiddenException('租户未审核通过，禁止访问');
        }
        if (tenant.isActive !== 1) {
          throw new ForbiddenException('租户已禁用，禁止访问');
        }
      }

      // 挂载租户信息，方便后续引出棒业务逻辑进行数据隔离
      request['user'] = payload;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException('验证失败');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
