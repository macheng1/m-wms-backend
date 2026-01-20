import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  tenantId: string | string[];
  traceId: string;
  body?: any;
  query?: any;
  params?: any;
}

interface ResponseLog {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  tenantId: string | string[];
  traceId: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, body, query, params, headers, ip } = request;
    // 优先从请求头获取，其次从 JWT payload 获取，最后默认值
    const tenantId = headers['x-tenant-id'] as string;
    const userAgent = (headers['user-agent'] as string) || 'N/A';
    const clientIp = Array.isArray(ip) ? ip[0] : ip;

    // 获取 traceId（前端必须传入，否则使用默认值）
    const traceId = (headers['x-trace-id'] as string) || 'MISSING_TRACE_ID';

    // 将 traceId 添加到响应头
    response.setHeader('x-trace-id', traceId);

    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // 请求日志
    const requestLog: RequestLog = {
      timestamp,
      method,
      url,
      ip: clientIp,
      userAgent,
      tenantId,
      traceId,
    };

    // 只有当 body/query/params 不为空时才记录
    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      requestLog.body = this.sanitizeData(body);
    }
    if (query && Object.keys(query).length > 0) {
      requestLog.query = query;
    }
    if (params && Object.keys(params).length > 0) {
      requestLog.params = params;
    }

    console.log(`📥 请求 => ${JSON.stringify(requestLog)}`);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;

          // 响应日志
          const responseLog: ResponseLog = {
            timestamp: new Date().toISOString(),
            method,
            url,
            statusCode,
            responseTime,
            tenantId,
            traceId,
          };

          console.log(`📤 响应 => ${JSON.stringify(responseLog)}`);
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          // 错误日志
          const responseLog: ResponseLog = {
            timestamp: new Date().toISOString(),
            method,
            url,
            statusCode,
            responseTime,
            tenantId,
            traceId,
          };

          console.error(`❌ 错误 => ${JSON.stringify(responseLog)}`);
        },
      }),
    );
  }

  /**
   * 过滤敏感数据（如密码）
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = [
      'password',
      'oldPassword',
      'newPassword',
      'confirmPassword',
      'secret',
      'token',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***';
      }
    }

    return sanitized;
  }
}
