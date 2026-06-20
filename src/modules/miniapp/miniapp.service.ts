import { BusinessException } from '@/common/filters/business.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { MiniappSilentLoginDto } from './dto/miniapp-auth.dto';
import { MiniappLocationDto } from './dto/miniapp-location.dto';
import { ApplyMiniappTenantDto } from './dto/miniapp-tenant.dto';
import {
  BindCurrentMiniappMemberPhoneDto,
  QueryMiniappMemberDto,
  UpdateCurrentMiniappMemberProfileDto,
  UpdateMiniappMemberAuthorizationDto,
  UpdateMiniappMemberRemarkDto,
  UpdateMiniappMemberStatusDto,
} from './dto/query-miniapp-member.dto';
import { MiniappMember } from './entities/miniapp-member.entity';
import { TenantsService } from '../tenant/tenants.service';
import { CreateTenantDto } from '../tenant/dto/create-tenant.dto';

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

export interface LocationView {
  address: string;
  provinceName: string;
  provinceCode: string;
  cityName: string;
  cityCode: string;
  districtName: string;
  districtCode: string;
}

@Injectable()
export class MiniappService {
  private wechatAccessTokenCache?: { token: string; expiresAt: number };

  constructor(
    @InjectRepository(MiniappMember)
    private readonly memberRepo: Repository<MiniappMember>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly tenantsService: TenantsService,
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

  async updateCurrentMemberProfile(memberId: string, dto: UpdateCurrentMiniappMemberProfileDto) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new BusinessException('会员不存在');
    if (member.isActive !== 1) throw new BusinessException('会员已被禁用');

    if (dto.nickName !== undefined) member.nickName = dto.nickName || null;
    if (dto.avatarUrl !== undefined) member.avatarUrl = dto.avatarUrl || null;

    return this.toMemberView(await this.memberRepo.save(member));
  }

  async bindCurrentMemberPhone(memberId: string, dto: BindCurrentMiniappMemberPhoneDto) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new BusinessException('会员不存在');
    if (member.isActive !== 1) throw new BusinessException('会员已被禁用');
    if (member.platform !== 'wechat') {
      throw new BusinessException('当前平台暂不支持手机号授权');
    }

    const accessToken = await this.getWechatAccessToken();
    const result = await this.requestMiniappApi<any>(
      'https://api.weixin.qq.com/wxa/business/getuserphonenumber',
      {
        method: 'POST',
        params: { access_token: accessToken },
        body: { code: dto.code },
      },
    );

    if (result.errcode && Number(result.errcode) !== 0) {
      throw new BusinessException(result.errmsg || '手机号授权失败');
    }

    const phoneNumber = result.phone_info?.phoneNumber || result.phone_info?.purePhoneNumber;
    if (!phoneNumber) {
      throw new BusinessException('手机号授权返回异常');
    }

    member.phoneNumber = phoneNumber;
    return this.toMemberView(await this.memberRepo.save(member));
  }

  async applyTenant(memberId: string, dto: ApplyMiniappTenantDto) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new BusinessException('会员不存在');
    if (member.isActive !== 1) throw new BusinessException('会员已被禁用');

    const phoneNumber = (member.phoneNumber || '').trim();
    if (!phoneNumber) throw new BusinessException('请先授权手机号');
    if (!dto.companyName?.trim()) throw new BusinessException('企业名称不能为空');
    if (member.tenantId && member.tenantBindStatus === 'pending') {
      throw new BusinessException('已提交企业认证，请勿重复提交');
    }

    const tenantPayload = {
      name: dto.companyName.trim(),
      tenantSource: 'miniapp',
      contactPhone: phoneNumber,
      contactPerson: (dto.contactPerson || member.nickName || '小程序用户').trim(),
      adminUser: phoneNumber,
      smsCode: 'MINIAPP_AUTHORIZED_PHONE',
      email: `${phoneNumber}@miniapp.local`,
      address: dto.address?.trim(),
      factoryAddress: dto.address?.trim(),
      registerAddress: dto.address?.trim(),
      creditCode: dto.creditCode?.trim(),
      taxNo: dto.creditCode?.trim(),
      businessLicenseNo: dto.creditCode?.trim(),
      legalPerson: dto.contactPerson?.trim(),
      mainProducts: dto.mainProducts?.trim(),
      remark: dto.businessLicenseImage ? `小程序营业执照：${dto.businessLicenseImage}` : undefined,
    } as CreateTenantDto;

    const tenantResult =
      member.tenantId && ['approved', 'rejected'].includes(member.tenantBindStatus)
        ? await this.tenantsService.resubmitMiniappTenant(member.tenantId, tenantPayload)
        : await this.tenantsService.onboardFromMiniapp(tenantPayload);
    member.tenantId = tenantResult.tenantId;
    member.tenantBindStatus = 'pending';
    member.tenantRole = 'owner';
    member.tenantBindRemark = null;
    member.phoneNumber = phoneNumber;
    const savedMember = await this.memberRepo.save(member);

    return {
      ...tenantResult,
      member: this.toMemberView(savedMember),
      message: '企业认证已提交',
    };
  }

  async getMyTenant(memberId: string) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new BusinessException('会员不存在');

    let tenant = null;
    if (member.tenantId) {
      try {
        tenant = await this.tenantsService.findOne(member.tenantId);
      } catch (error) {
        tenant = null;
      }
    }

    return {
      member: this.toMemberView(member),
      tenant,
    };
  }

  async getLocation(dto: MiniappLocationDto, clientIp?: string): Promise<LocationView> {
    if (this.hasCoordinate(dto)) {
      const location =
        (await this.reverseGeocodeByTencent(dto.latitude, dto.longitude)) ||
        (await this.reverseGeocodeByAmap(dto.latitude, dto.longitude)) ||
        (await this.reverseGeocodeByNominatim(dto.latitude, dto.longitude));
      if (location) return location;
    }

    return this.emptyLocation(clientIp);
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

  async updateMemberAuthorization(memberId: string, dto: UpdateMiniappMemberAuthorizationDto) {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
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

  private async getWechatAccessToken() {
    if (this.wechatAccessTokenCache && this.wechatAccessTokenCache.expiresAt > Date.now()) {
      return this.wechatAccessTokenCache.token;
    }

    const { appid, secret } = this.getMiniappCredential('wechat');
    const result = await this.requestMiniappApi<any>('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid,
        secret,
      },
    });

    if (result.errcode) {
      throw new BusinessException(result.errmsg || '微信 access_token 获取失败');
    }
    if (!result.access_token) {
      throw new BusinessException('微信 access_token 返回异常');
    }

    const expiresIn = Number(result.expires_in || 7200);
    this.wechatAccessTokenCache = {
      token: result.access_token,
      expiresAt: Date.now() + Math.max(expiresIn - 300, 60) * 1000,
    };

    return result.access_token as string;
  }

  private hasCoordinate(dto: MiniappLocationDto) {
    return Number.isFinite(dto.latitude) && Number.isFinite(dto.longitude);
  }

  private async reverseGeocodeByTencent(latitude: number, longitude: number) {
    const key = this.configService.get<string>('TENCENT_MAP_KEY');
    if (!key) return null;

    const url = new URL('https://apis.map.qq.com/ws/geocoder/v1/');
    url.searchParams.set('location', `${latitude},${longitude}`);
    url.searchParams.set('key', key);
    url.searchParams.set('get_poi', '0');

    const data = await this.requestJson<any>(url);
    if (!data || data.status !== 0) return null;

    const component = data.result?.address_component || {};
    const adInfo = data.result?.ad_info || {};

    return {
      address: data.result?.address || '',
      provinceName: component.province || '',
      provinceCode: '',
      cityName: component.city || component.province || '',
      cityCode: '',
      districtName: component.district || '',
      districtCode: adInfo.adcode || '',
    };
  }

  private async reverseGeocodeByAmap(latitude: number, longitude: number) {
    const key = this.configService.get<string>('AMAP_WEB_SERVICE_KEY');
    if (!key) return null;

    const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
    url.searchParams.set('location', `${longitude},${latitude}`);
    url.searchParams.set('key', key);
    url.searchParams.set('extensions', 'base');
    url.searchParams.set('output', 'json');

    const data = await this.requestJson<any>(url);
    if (!data || data.status !== '1') return null;

    const component = data.regeocode?.addressComponent || {};
    const cityName = Array.isArray(component.city)
      ? ''
      : component.city || component.province || '';

    return {
      address: data.regeocode?.formatted_address || '',
      provinceName: component.province || '',
      provinceCode: '',
      cityName,
      cityCode: component.citycode || '',
      districtName: Array.isArray(component.district) ? '' : component.district || '',
      districtCode: component.adcode || '',
    };
  }

  private async reverseGeocodeByNominatim(latitude: number, longitude: number) {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('zoom', '10');
    url.searchParams.set('accept-language', 'zh-CN');

    const data = await this.requestJson<any>(url);
    const address = data?.address;
    if (!address) return null;

    const provinceName = address.state || address.province || '';
    const cityName =
      address.city || address.town || address.municipality || address.county || provinceName || '';
    const districtName = address.city_district || address.district || address.county || '';

    return {
      address: data.display_name || '',
      provinceName,
      provinceCode: '',
      cityName,
      cityCode: '',
      districtName,
      districtCode: '',
    };
  }

  private async requestJson<T>(url: URL): Promise<T | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'm-wms-backend/1.0' },
      });
      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch (error) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private emptyLocation(clientIp?: string): LocationView {
    return {
      address: clientIp || '',
      provinceName: '',
      provinceCode: '',
      cityName: '',
      cityCode: '',
      districtName: '',
      districtCode: '',
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
    view.isEnterpriseNo = member.tenantBindStatus === 'approved' ? '1' : '0';
    return view;
  }
}
