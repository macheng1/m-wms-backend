-- 用途：调整平台端/租户端一级菜单排序，系统设置固定在底部
-- 影响范围：menus

UPDATE `menus`
SET `sortOrder` = CASE `code`
  WHEN 'platform:dashboard' THEN 10
  WHEN 'platform:tenant' THEN 20
  WHEN 'platform:template' THEN 30
  WHEN 'platform:settings' THEN 990
  ELSE `sortOrder`
END
WHERE `code` IN (
  'platform:dashboard',
  'platform:tenant',
  'platform:template',
  'platform:settings'
);

UPDATE `menus`
SET `sortOrder` = CASE `code`
  WHEN 'tenant:dashboard' THEN 10
  WHEN 'tenant:base' THEN 20
  WHEN 'tenant:portal' THEN 30
  WHEN 'tenant:product' THEN 40
  WHEN 'tenant:order' THEN 50
  WHEN 'tenant:warehouse' THEN 60
  WHEN 'tenant:inventory' THEN 70
  WHEN 'tenant:settings' THEN 990
  ELSE `sortOrder`
END
WHERE `code` IN (
  'tenant:dashboard',
  'tenant:base',
  'tenant:portal',
  'tenant:product',
  'tenant:order',
  'tenant:warehouse',
  'tenant:inventory',
  'tenant:settings'
);
