import { BaseEntity } from '@/database/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('miniapp_members')
@Index('IDX_miniapp_member_created', ['createdAt'])
@Index('IDX_miniapp_member_openid', ['platform', 'appId', 'openId'], { unique: true })
export class MiniappMember extends BaseEntity {
  @Column({ length: 20, default: 'wechat', comment: '小程序平台：wechat/toutiao' })
  platform: string;

  @Column({ length: 64, comment: '小程序 AppID' })
  appId: string;

  @Column({ length: 100, comment: '小程序 openId' })
  openId: string;

  @Column({ length: 100, nullable: true, comment: '小程序 unionId' })
  unionId: string | null;

  @Column({ type: 'text', nullable: true, select: false, comment: '小程序 session_key' })
  sessionKey: string | null;

  @Column({ length: 100, nullable: true, comment: '会员昵称' })
  nickName: string | null;

  @Column({ type: 'text', nullable: true, comment: '头像 URL' })
  avatarUrl: string | null;

  @Column({ length: 30, nullable: true, comment: '手机号' })
  phoneNumber: string | null;

  @Column({ length: 20, nullable: true, comment: '性别' })
  gender: string | null;

  @Column({ length: 100, nullable: true, comment: '国家' })
  country: string | null;

  @Column({ length: 100, nullable: true, comment: '省份' })
  province: string | null;

  @Column({ length: 100, nullable: true, comment: '城市' })
  city: string | null;

  @Column({ type: 'int', default: 0, comment: '登录次数' })
  loginCount: number;

  @Column({ type: 'datetime', nullable: true, comment: '最后登录时间' })
  lastLoginAt: Date | null;

  @Column({ length: 80, nullable: true, comment: '最后登录 IP' })
  lastLoginIp: string | null;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1正常，0禁用' })
  isActive: number;

  @Column({ length: 1, default: '0', comment: '是否同意隐私协议：1是，0否' })
  isAuthorization: string;

  @Column({ type: 'text', nullable: true, comment: '后台备注' })
  remark: string | null;
}
