import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  portalDomain: process.env.PORTAL_DOMAIN || 'https://pinmalink.com',
  // 环境子域名映射
  portalSubDomain:
    process.env.PORTAL_SUB_DOMAIN ||
    JSON.stringify({
      development: 'dev',
      test: 'test',
      uat: 'uat',
    }),
}));
