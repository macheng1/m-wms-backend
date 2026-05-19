import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('小程序 API 边界')
@Controller('miniapp')
export class MiniappApiController {
  @Get('meta')
  @Public()
  @ApiOperation({ summary: '小程序 API 边界信息' })
  getMeta() {
    return {
      type: 'miniapp',
      client: 'myapp',
      auth: 'miniapp-session',
      tenantSource: 'miniapp-config-or-user-binding',
      basePath: '/api/miniapp',
      status: 'skeleton',
    };
  }
}
