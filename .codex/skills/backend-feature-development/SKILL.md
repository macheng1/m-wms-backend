---
name: backend-feature-development
description: 按后端设计实现功能时使用：创建或修改 NestJS 模块、DTO、Entity、Service、Controller、权限、事务、迁移、Swagger 和业务逻辑。
---

# 后端功能开发

## 使用目标

按照已经明确的 PRD、表结构和 API 契约，把后端功能安全落地到 NestJS 项目中。

## 工作流程

1. 先确认需求、表结构、接口契约和已有相似模块。
2. 按顺序实现：
   - Entity / migration
   - `dbsql/` SQL 文件
   - DTO
   - Service
   - Controller
   - Module 注册
   - 权限/公开接口
   - Swagger
   - 测试
3. 每完成一个垂直功能，检查租户隔离、异常处理和返回结构。
4. 对多表写入、库存/订单状态变化、批量导入使用事务评估。
5. 最后运行构建、测试或 lint。

## 开发规则

- Controller 保持轻量，复杂逻辑放 Service。
- Service 负责业务校验、事务、Repository 和外部服务调用。
- 所有租户业务查询带 `tenantId`。
- 业务错误优先使用 `BusinessException`。
- DTO 使用 `class-validator` 和 Swagger 装饰器。
- 修改实体后评估 migration。
- 涉及建表、字段新增、字段删除、字段修改、索引、约束、初始化数据或维护数据时，必须在 `dbsql/` 下补充对应 SQL。
- 不引入与项目风格不一致的新抽象。

## 完成标准

- API 能按契约返回。
- DTO 校验覆盖主要非法输入。
- 租户隔离没有绕过路径。
- 权限和公开接口处理明确。
- 数据库变更有 migration 评估。
- 数据库 SQL 已沉淀到 `dbsql/`。
- 构建/测试/lint 至少按改动风险执行一项或多项。

## 常见风险

- 只实现 happy path，遗漏异常和边界。
- Controller 里写大量业务逻辑。
- 忘记 module 注册导致运行时依赖注入失败。
- 新增实体但没有加入模块或 migration。
- 返回敏感字段。
