import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
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

  // src/modules/auth/auth.service.ts
  async login(loginDto: LoginDto) {
    const { username, password, tenantCode } = loginDto;

    // 1. 查找用户逻辑（根据 tenantCode 区分平台管理员或工厂员工）
    const user = await this.findUserForLogin(username, tenantCode);
    if (!user) throw new BadRequestException('账号或企业编码错误');

    // 2. 校验密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new BadRequestException('密码错误');

    // 3. 签发 JWT (载荷只包含核心 ID，不包含权限列表，防止 Token 过大)
    const payload = {
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
      isAdmin: user.isPlatformAdmin,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  // src/modules/auth/auth.service.ts

  /**
   * 核心身份识别逻辑：根据用户名和企业编码定位用户
   * @param username 用户名
   * @param tenantCode 企业编码（可选）
   */
  private async findUserForLogin(username: string, tenantCode?: string): Promise<User | null> {
    // 1. 创建基础查询器
    const query = this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password') // 关键：手动抓取实体中 select: false 的密码字段
      .leftJoinAndSelect('user.tenant', 'tenant'); // 关联查询租户信息，方便后续逻辑使用

    if (!tenantCode) {
      /**
       * 场景 A：未提供企业编码
       * 逻辑：仅查找“平台超级管理员” (isPlatformAdmin = true)
       * 这种账号不属于任何租户，通常用于系统运营
       */
      query
        .where('user.username = :username', { username })
        .andWhere('user.isPlatformAdmin = :isAdmin', { isAdmin: true });
    } else {
      /**
       * 场景 B：提供了企业编码
       * 逻辑：先锁定租户，再在该租户范围内查找用户
       */
      // 先根据 code 找到租户 ID
      const tenant = await this.tenantRepository.findOne({ where: { code: tenantCode } });
      if (!tenant) return null;

      query
        .where('user.username = :username', { username })
        .andWhere('user.tenantId = :tenantId', { tenantId: tenant.id })
        .andWhere('user.isPlatformAdmin = :isAdmin', { isAdmin: false });
    }

    return await query.getOne();
  }
}
