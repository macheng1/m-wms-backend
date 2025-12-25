import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TenantId } from '@common/decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto, @TenantId() tenantId: string) {
    return this.authService.register(registerDto, tenantId);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto, @TenantId() tenantId: string) {
    return this.authService.login(loginDto, tenantId);
  }
}
