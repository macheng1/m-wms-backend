import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    const tenantId = headers['x-tenant-id'] || 'N/A';
    const now = Date.now();

    this.logger.log(`[${method}] ${url} - Tenant: ${tenantId} - Request: ${JSON.stringify(body)}`);

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(
          `[${method}] ${url} - Tenant: ${tenantId} - Completed in ${responseTime}ms`,
        );
      }),
    );
  }
}
