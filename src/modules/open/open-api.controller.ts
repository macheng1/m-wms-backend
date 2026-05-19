import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('服务器调用 Open API 边界')
@Controller('open/v1')
export class OpenApiController {
  @Get('meta')
  @Public()
  @ApiOperation({ summary: 'Open API 边界信息' })
  getMeta() {
    return {
      type: 'open',
      client: 'server-to-server',
      auth: 'app-signature',
      tenantSource: 'app-credential',
      basePath: '/api/open/v1',
      status: 'skeleton',
    };
  }
}
