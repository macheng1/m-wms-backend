// src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { BusinessException } from './business.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let code = HttpStatus.INTERNAL_SERVER_ERROR; // 默认 500
    let message = '服务器内部错误';
    let data = null;

    if (exception instanceof BusinessException) {
      // --- 处理自定义业务异常 ---
      code = exception.getBusinessCode();
      message = exception.message;
      data = exception.getBusinessData();
    } else if (exception instanceof HttpException) {
      // --- 处理 NestJS 内置异常 (如 UnauthorizedException) ---
      code = exception.getStatus();
      const res: any = exception.getResponse();
      message = res.message || exception.message;
    } else {
      // --- 处理未知的程序崩溃 ---
      message = exception.message || '未知错误';
    }

    // 强制 HTTP 状态码为 200
    response.status(200).json({
      code, // 这里就是你定义的 10001
      message,
      data, // 这里就是你自定义放进去的对象
      timestamp: new Date().toISOString(),
    });
  }
}
