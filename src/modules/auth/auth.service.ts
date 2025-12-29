import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, tenantId: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      tenantId,
    });

    return this.userRepository.save(user);
  }

  /**
   * 验证用户并返回 Token
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 1. 从数据库查找用户
    // 注意：因为实体中 password 设置了 select: false，所以这里必须手动 addSelect
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username', { username })
      .addSelect('user.password') // 显式抓取密码用于比对
      .getOne();

    // 2. 验证用户是否存在
    if (!user) {
      throw new UnauthorizedException('该账号不存在，请联系管理员');
    }

    // 3. 验证账号是否被禁用 (SaaS 系统常见逻辑)
    if (!user.isActive) {
      throw new UnauthorizedException('账号已被禁用，请联系工厂管理员');
    }

    // 4. 比对密码（使用 bcrypt 将明文与数据库中的哈希值比对）
    const isPasswordMatching = await bcrypt.compare(password, user.password);

    if (!isPasswordMatching) {
      throw new UnauthorizedException('密码错误，请重新输入');
    }

    // 5. 验证通过，生成 JWT 载荷 (Payload)
    // 包含：用户ID、用户名、以及最重要的租户ID (SaaS 身份核心)
    const payload = {
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
    };

    // 6. 签发 Token 并返回给前端
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        // nickname: user.nickname,
        tenantId: user.tenantId,
      },
    };
  }
  async validateUser(userId: string): Promise<User> {
    return this.userRepository.findOne({ where: { id: userId } });
  }
}
