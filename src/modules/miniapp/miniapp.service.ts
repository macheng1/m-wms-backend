import { BusinessException } from '@/common/filters/business.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { MiniappSilentLoginDto } from './dto/miniapp-auth.dto';
import {
  QueryMiniappMemberDto,
  UpdateMiniappMemberAuthorizationDto,
  UpdateMiniappMemberRemarkDto,
  UpdateMiniappMemberStatusDto,
} from './dto/query-miniapp-member.dto';
import { MiniappMember } from './entities/miniapp-member.entity';

type MiniappPlatform = 'wechat' | 'toutiao';

interface MiniappSession {
  appid: string;
  openid: string;
  unionid?: string;
  session_key: string;
}

interface MiniappHttpRequestOptions {
  method?: 'GET' | 'POST';
  params?: Record<string, string>;
  body?: Record<string, any>;
}

@Injectable()
export class MiniappService {
  constructor(
    @InjectRepository(MiniappMember)
    private readonly memberRepo: Repository<MiniappMember>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async silentLogin(dto: MiniappSilentLoginDto, clientIp?: string) {
    const platform = dto.platform || 'wechat';
    const session = await this.code2Session(dto.code, platform);
    const now = new Date();

    let member = await this.memberRepo.findOne({
      where: { platform, appId: session.appid, openId: session.openid },
    });

    if (!member) {
      member = this.memberRepo.create({
        platform,
        appId: session.appid,
        openId: session.openid,
        loginCount: 0,
        isActive: 1,
        isAuthorization: '0',
      });
    }

    if (member.isActive !== 1) {
      throw new BusinessException('会员已被禁用');
    }

    Object.assign(member, {
      platform,
      unionId: session.unionid || member.unionId || null,
      sessionKey: session.session_key,
      loginCount: (member.loginCount || 0) + 1,
      lastLoginAt: now,
      lastLoginIp: clientIp || member.lastLoginIp || null,
      ...this.pickProfile(dto.profile || {}),
    });

    const savedMember = await this.memberRepo.save(member);
    const token = this.jwtService.sign({
      tokenType: 'miniapp',
      sub: savedMember.id,
      memberId: savedMember.id,
      openId: savedMember.openId,
      platform: savedMember.platform,
      appId: savedMember.appId,
    });

    return {
      tokenName: 'authorization',
      tokenValue: token,
      member: this.toMemberView(savedMember),
    };
  }

  async findMembers(query: QueryMiniappMemberDto) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const qb = this.memberRepo.createQueryBuilder('member');

    if (query.isActive !== undefined) {
      qb.andWhere('member.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.platform) {
      qb.andWhere('member.platform = :platform', { platform: query.platform });
    }

    if (query.keyword) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('member.nickName LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('member.phoneNumber LIKE :keyword', { keyword: `%${query.keyword}%` })
            .orWhere('member.openId LIKE :keyword', { keyword: `%${query.keyword}%` });
        }),
      );
    }

    const [list, total] = await qb
      .orderBy('member.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list: list.map((item) => this.toMemberView(item)),
      total,
      page,
      pageSize,
    };
  }

  async getCurrentMember(memberId: string) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new BusinessException('会员不存在');
    if (member.isActive !== 1) throw new BusinessException('会员已被禁用');
    return this.toMemberView(member);
  }

  async getMemberDetail(id: string) {
    const member = await this.memberRepo.findOne({ where: { id } });
    if (!member) throw new BusinessException('会员不存在');
    return this.toMemberView(member);
  }

  async updateMemberStatus(id: string, dto: UpdateMiniappMemberStatusDto) {
    const member = await this.memberRepo.findOne({ where: { id } });
    if (!member) throw new BusinessException('会员不存在');
    member.isActive = dto.isActive;
    return this.toMemberView(await this.memberRepo.save(member));
  }

  async updateMemberRemark(id: string, dto: UpdateMiniappMemberRemarkDto) {
    const member = await this.memberRepo.findOne({ where: { id } });
    if (!member) throw new BusinessException('会员不存在');
    member.remark = dto.remark || null;
    return this.toMemberView(await this.memberRepo.save(member));
  }

  async updateMemberAuthorization(dto: UpdateMiniappMemberAuthorizationDto) {
    const member = await this.memberRepo.findOne({ where: { id: dto.id } });
    if (!member) throw new BusinessException('会员不存在');
    member.isAuthorization = dto.isAuthorization;
    return this.toMemberView(await this.memberRepo.save(member));
  }

  private async code2Session(code: string, platform: MiniappPlatform): Promise<MiniappSession> {
    return platform === 'toutiao' ? this.toutiaoCode2Session(code) : this.wechatCode2Session(code);
  }

  private getMiniappCredential(platform: MiniappPlatform) {
    const appid =
      platform === 'toutiao'
        ? this.configService.get<string>('TOUTIAO_MINIAPP_APP_ID')
        : this.configService.get<string>('WECHAT_MINIAPP_APP_ID');
    const secret =
      platform === 'toutiao'
        ? this.configService.get<string>('TOUTIAO_MINIAPP_APP_SECRET')
        : this.configService.get<string>('WECHAT_MINIAPP_APP_SECRET');

    if (!appid || !secret) {
      throw new BusinessException(
        platform === 'toutiao'
          ? '抖音小程序 AppID 或 Secret 未配置'
          : '微信小程序 AppID 或 Secret 未配置',
      );
    }

    return { appid, secret };
  }

  private async wechatCode2Session(code: string): Promise<MiniappSession> {
    const { appid, secret } = this.getMiniappCredential('wechat');
    const result = await this.requestMiniappApi('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid,
        secret,
        js_code: code,
        grant_type: 'authorization_code',
      },
    });
    if (result.errcode) {
      throw new BusinessException(result.errmsg || '微信静默登录失败');
    }
    if (!result.openid || !result.session_key) {
      throw new BusinessException('微信静默登录返回异常');
    }
    return {
      appid,
      openid: result.openid as string,
      unionid: result.unionid as string | undefined,
      session_key: result.session_key as string,
    };
  }

  private async toutiaoCode2Session(code: string): Promise<MiniappSession> {
    const { appid, secret } = this.getMiniappCredential('toutiao');
    const result = await this.requestMiniappApi(
      'https://developer.toutiao.com/api/apps/v2/jscode2session',
      {
        method: 'POST',
        body: { appid, secret, code },
      },
    );
    const data = result.data || result;
    const errCode = result.errcode ?? result.err_no ?? data.errcode ?? data.err_no;

    if (errCode && Number(errCode) !== 0) {
      throw new BusinessException(
        result.errmsg || result.err_tips || data.errmsg || '抖音静默登录失败',
      );
    }
    if (!data.openid || !data.session_key) {
      throw new BusinessException('抖音静默登录返回异常');
    }

    return {
      appid,
      openid: data.openid as string,
      unionid: data.unionid as string | undefined,
      session_key: data.session_key as string,
    };
  }

  private async requestMiniappApi<T = any>(
    requestUrl: string,
    options: MiniappHttpRequestOptions = {},
  ): Promise<T> {
    const method = options.method || 'GET';
    const url = new URL(requestUrl);
    Object.entries(options.params || {}).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify(options.body || {}) : undefined,
    });

    if (!response.ok) {
      throw new BusinessException('小程序平台接口请求失败');
    }

    return response.json() as Promise<T>;
  }

  private pickProfile(profile: Record<string, any>) {
    return {
      nickName: profile.nickName || profile.nickname || undefined,
      avatarUrl: profile.avatarUrl || profile.avatar || undefined,
      phoneNumber: profile.phoneNumber || undefined,
      gender: profile.gender !== undefined ? String(profile.gender) : undefined,
      country: profile.country || undefined,
      province: profile.province || undefined,
      city: profile.city || undefined,
    };
  }

  private toMemberView(member: MiniappMember) {
    const view = { ...(member as any) };
    delete view.sessionKey;
    return view;
  }
}
