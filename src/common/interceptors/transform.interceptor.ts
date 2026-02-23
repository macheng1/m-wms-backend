// src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// 定义标准返回结构
export interface Response<T> {
  code: number;
  data: T;
  message: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse();

    /**
     * 关键逻辑：强制将所有成功的 HTTP 状态码设为 200
     * 这样无论 Controller 默认返回 201 还是 204，前端收到的都是 200
     */
    response.status(HttpStatus.OK);

    return next.handle().pipe(
      map((data) => {
        // 这里的 data 是 Controller 方法 return 的内容
        return {
          code: 200, // 业务逻辑代码
          data: data === undefined ? null : data, // 如果没有返回值则补 null
          message: '请求成功', // 默认成功提示
        };
      }),
    );
  }
}
