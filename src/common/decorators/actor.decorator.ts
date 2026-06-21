import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 操作者上下文：谁（操作人）从哪里（来源）发起了本次操作。
 * - operatorId / operatorName 取自 JWT（req.user）。
 * - source 取自请求头 x-source-type，各端约定：admin-web（后台）/ miniapp（小程序）/ app（手机）。
 */
export interface ActorContext {
  operatorId?: string;
  operatorName?: string;
  source?: string;
}

/** 控制器参数装饰器：一次性取出操作人与来源，透传给 service 落库 */
export const Actor = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ActorContext => {
    const req = ctx.switchToHttp().getRequest();
    return {
      operatorId: req.user?.userId,
      operatorName: req.user?.username,
      source: (req.headers?.['x-source-type'] as string) || undefined,
    };
  },
);
