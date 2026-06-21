import { registerAs } from '@nestjs/config';

export default registerAs('openApi', () => ({
  appKey: process.env.OPEN_API_APP_KEY || '',
  appSecret: process.env.OPEN_API_APP_SECRET || '',
  signWindowSeconds: parseInt(process.env.OPEN_API_SIGN_WINDOW_SECONDS || '300', 10),
}));
