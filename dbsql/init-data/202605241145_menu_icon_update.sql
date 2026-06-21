-- 用途：补齐侧边栏常用菜单图标字段
-- 说明：前端会优先按 code 使用本地图标映射；这里同步数据库字段，方便平台菜单维护时展示。

UPDATE `menus`
SET `icon` = CASE `code`
  WHEN 'platform:dashboard' THEN 'IconHome'
  WHEN 'platform:tenant' THEN 'IconUserGroup'
  WHEN 'platform:tenant:list' THEN 'IconUserGroup'
  WHEN 'platform:settings' THEN 'IconSetting'
  WHEN 'platform:user' THEN 'IconUserGroup'
  WHEN 'platform:role' THEN 'IconSetting'
  WHEN 'platform:menu' THEN 'IconList'
  WHEN 'platform:config' THEN 'IconSetting'
  WHEN 'platform:dept' THEN 'IconUserGroup'
  WHEN 'platform:post' THEN 'IconUserGroup'
  WHEN 'platform:audit-log' THEN 'IconList'
  WHEN 'platform:template' THEN 'IconList'
  WHEN 'platform:template:category' THEN 'IconList'
  WHEN 'platform:template:attribute' THEN 'IconAppCenter'
  WHEN 'platform:template:unit' THEN 'IconKanban'
  WHEN 'tenant:dashboard' THEN 'IconHome'
  WHEN 'tenant:base' THEN 'IconAppCenter'
  WHEN 'tenant:portal' THEN 'IconGlobeStroke'
  WHEN 'tenant:product' THEN 'IconKanban'
  WHEN 'tenant:warehouse' THEN 'IconHome'
  WHEN 'tenant:inventory' THEN 'IconKanban'
  WHEN 'tenant:settings' THEN 'IconSetting'
  ELSE `icon`
END
WHERE `code` IN (
  'platform:dashboard',
  'platform:tenant',
  'platform:tenant:list',
  'platform:settings',
  'platform:user',
  'platform:role',
  'platform:menu',
  'platform:config',
  'platform:dept',
  'platform:post',
  'platform:audit-log',
  'platform:template',
  'platform:template:category',
  'platform:template:attribute',
  'platform:template:unit',
  'tenant:dashboard',
  'tenant:base',
  'tenant:portal',
  'tenant:product',
  'tenant:warehouse',
  'tenant:inventory',
  'tenant:settings'
);
