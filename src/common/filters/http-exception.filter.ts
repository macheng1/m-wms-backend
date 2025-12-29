// src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    // 强制异常请求的 HTTP 状态码也返回 200
    response.status(200).json({
      code: status, // 业务码通常对应原始 HTTP 状态码，如 401, 403
      data: null,
      message: exceptionResponse.message || exception.message || '请求失败',
    });
  }
}
