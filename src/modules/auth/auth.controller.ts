import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TenantId } from '@common/decorators';
import { ApiOperation } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto, @TenantId() tenantId: string) {
    return this.authService.register(registerDto, tenantId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK) // 登录通常返回 200 而非 201
  @ApiOperation({ summary: '用户登录', description: '支持账号密码登录，成功后返回 JWT' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
