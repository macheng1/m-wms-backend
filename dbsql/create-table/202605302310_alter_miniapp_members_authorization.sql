-- 小程序会员隐私协议授权状态
ALTER TABLE `miniapp_members`
  ADD COLUMN `isAuthorization` varchar(1) NOT NULL DEFAULT '0' COMMENT '是否同意隐私协议：1是，0否' AFTER `isActive`;
