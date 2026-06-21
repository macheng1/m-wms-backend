import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TenantId } from '@common/decorators';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';

@ApiTags('认证登录')
@ApiBearerAuth()
@Controller('user')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '注册租户用户' })
  @ApiBody({
    type: RegisterDto,
    examples: {
      default: {
        summary: '注册示例',
        value: {
          username: 'zhangsan',
          phone: '13800138000',
          smsCode: '123456',
          email: 'user@example.com',
          password: 'Admin123456',
          firstName: 'San',
          lastName: 'Zhang',
        },
      },
    },
  })
  register(@Body() registerDto: RegisterDto, @TenantId() tenantId: string) {
    return this.authService.register(registerDto, tenantId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK) // 登录通常返回 200 而非 201
  @Public()
  @RateLimit({
    keyPrefix: 'admin-login',
    points: 10,
    durationSeconds: 60,
    keyFields: ['username', 'code'],
  })
  @ApiOperation({ summary: '用户登录', description: '支持账号密码登录，成功后返回 JWT' })
  @ApiBody({
    type: LoginDto,
    examples: {
      platformAdmin: {
        summary: '平台管理员登录',
        value: {
          code: '',
          username: 'platform_admin',
          password: 'Admin123456',
        },
      },
      tenantUser: {
        summary: '租户用户登录',
        value: {
          code: 'XH001',
          username: 'admin',
          password: 'Admin123456',
        },
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
