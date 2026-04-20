import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('🚀 ~ TenantMiddleware ~ use ~ req:', req.originalUrl);
    console.log('🚀 ~ TenantMiddleware ~ use ~ req:', req.path);
    // 从请求头获取租户 ID
    const tenantId = req.headers['x-tenant-id'] as string;

    // 如果是公共路由（如登录、健康检查），则跳过租户验证
    const publicPaths = ['/api/health', '/user/login', '/user/register'];
    if (publicPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required in headers (x-tenant-id)');
    }

    // 将租户 ID 附加到请求对象
    req.tenantId = tenantId;

    next();
  }
}
