# 小程序信息发布审核 PRD（后端）

## 背景与目标

制造业小程序从展示型首页升级为供需信息平台。首页 6 个分类由 B 端维护，用户按分类发布信息，信息需要平台审核后才进入公开列表。

## 本期范围

- 分类支持发布字段模板 `templateFields`，用于小程序动态生成发布表单。
- 发布信息支持结构化字段 `structuredData`、地区 `region`、审核时间 `auditedAt`。
- 发布默认进入 `pending`，公开列表只返回 `published`。
- 管理端可按状态、关键词、地区、认证企业筛选信息，并进行通过、驳回、下架。
- 小程序我的发布、删除、收藏、取消收藏、收藏列表统一迁移到 `/api/miniapp/posts` 新接口。

## 状态规则

- `pending`：待审核，新发布或重新提交。
- `published`：审核通过，进入公开列表，可被收藏。
- `rejected`：审核驳回，保留 `auditRemark`。
- `offline`：下架/删除，不进入公开列表。

## 数据与接口

- `miniapp_categories.templateFields`：JSON 数组，字段包括 `field`、`label`、`type`、`required`、`options`、`placeholder`。
- `miniapp_posts.structuredData`：JSON 对象，保存分类模板对应的发布内容。
- `miniapp_posts.region`：用于列表筛选。
- `miniapp_post_collections`：会员收藏关系表。

新增/调整接口：

- `GET/POST /api/miniapp/posts/admin/list`
- `POST /api/miniapp/posts/:id/status`
- `GET/POST /api/miniapp/posts/my/list`
- `POST /api/miniapp/posts/:id/delete`
- `POST /api/miniapp/posts/:id/collect`
- `POST /api/miniapp/posts/:id/cancelCollect`
- `GET/POST /api/miniapp/posts/collect/list`

## 已执行初始化

- 已执行表字段和收藏表 SQL。
- 已初始化 `platform:miniapp:post:list` 菜单。
- 已给 6 个制造业分类写入默认发布模板。

## 待补功能

- 审核操作日志和审核人字段。
- 发布编辑/重新提交接口。
- 详情页公开访问权限策略：当前仍可按 ID 查看详情，后续建议仅公开 `published`，我的发布走独立详情。
- 投诉举报、违规处理、信息置顶/推荐。
