// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

// 定义用于反射的 Key
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public 装饰器
 * 用于标记不需要登录即可访问的接口
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
