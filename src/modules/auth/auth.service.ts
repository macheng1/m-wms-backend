import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { SmsService } from '../aliyun/sms/sms.service';
import { BusinessException } from '@/common/filters/business.exception';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private jwtService: JwtService,
    private smsService: SmsService,
  ) {}

  async register(registerDto: RegisterDto, tenantId: string): Promise<User> {
    // 1. 验证短信验证码
    const isValidCode = await this.smsService.verifyCode(registerDto.phone, registerDto.smsCode);
    if (!isValidCode) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 2. 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username: registerDto.username },
    });
    if (existingUser) {
      throw new BusinessException('用户名已被使用');
    }

    // 3. 检查手机号是否已注册
    const existingPhone = await this.userRepository
      .createQueryBuilder('user')
      .where('user.phone = :phone', { phone: registerDto.phone })
      .getOne();
    if (existingPhone) {
      throw new BusinessException('该手机号已注册');
    }

    // 4. 加密密码
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 5. 创建用户
    const user = this.userRepository.create({
      username: registerDto.username,
      phone: registerDto.phone,
      password: hashedPassword,
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      tenantId,
    });

    const savedUser = await this.userRepository.save(user);

    // 6. 验证成功后删除验证码
    await this.smsService.deleteCode(registerDto.phone);

    return savedUser;
  }

  // src/modules/auth/auth.service.ts
  async login(loginDto: LoginDto) {
    const { username, password, code } = loginDto;

    // 1. 查找用户逻辑（根据 tenantCode 区分平台管理员或工厂员工）
    const user = await this.findUserForLogin(username, code);
    console.log('🚀 ~ AuthService ~ login ~ user:', user);
    if (!user) throw new BadRequestException('账号或企业编码错误');

    // 2. 校验密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new BadRequestException('密码错误');

    // 3. 签发 JWT (载荷只包含核心 ID，不包含权限列表，防止 Token 过大)
    const payload = {
      sub: user.id,
      userId: user.id,
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
   * @param code 企业编码（可选）
   */
  private async findUserForLogin(username: string, code?: string): Promise<User | null> {
    console.log('🚀 ~ AuthService ~ findUserForLogin ~ tenantCode:', code);
    // 1. 创建基础查询器
    const query = this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password') // 关键：手动抓取实体中 select: false 的密码字段
      .leftJoinAndSelect('user.tenant', 'tenant'); // 关联查询租户信息，方便后续逻辑使用

    if (!code) {
      /**
       * 场景 A：未提供企业编码
       * 逻辑：仅查找“平台超级管理员” (isPlatformAdmin = true)
       * 这种账号不属于任何租户，通常用于系统运营
       */
      query
        .where('user.username = :username', { username })
        .andWhere('user.isPlatformAdmin = :isAdmin', { isAdmin: 1 });
    } else {
      /**
       * 场景 B：提供了企业编码
       * 逻辑：先锁定租户，再在该租户范围内查找用户
       */
      // 先根据 code 找到租户 ID
      const tenant = await this.tenantRepository.findOne({ where: { code: code } });
      console.log('🚀 ~ AuthService ~ findUserForLogin ~ tenant:', tenant);
      if (!tenant) return null;
      if (tenant.isApproved !== 1) {
        throw new BusinessException('企业未审核通过，暂不可登录');
      }
      if (tenant.isActive !== 1) {
        throw new BusinessException('企业已被禁用，暂不可登录');
      }

      query
        .where('user.username = :username', { username })
        .andWhere('user.tenantId = :tenantId', { tenantId: tenant.id })
        .andWhere('user.isPlatformAdmin = :isAdmin', { isAdmin: 0 });
    }

    return await query.getOne();
  }
}
