# Codex Skills 执行协议

## 定位

- 本文件用于约束当前项目内 `.codex/skills/` 的使用方式。
- 根目录 `AGENTS.md` 负责项目代码规范和工程约定；本文件负责说明什么时候调用哪些 skill，以及按什么顺序推进后端任务。
- 所有回复默认使用中文。

## 可用 Skills

- `$backend-prd-analysis`：从 PRD、产品说明、业务描述中拆解后端任务。
- `$database-schema-design`：设计或调整数据库表结构、字段、索引、实体关系、必要初始化数据、维护数据 SQL 和 migration。
- `$api-contract-design`：设计接口路径、DTO、返回结构、错误场景、Swagger、权限和联调契约。
- `$backend-feature-development`：按设计实现 NestJS 后端功能。
- `$backend-test-verification`：进行构建、测试、lint、接口、权限、多租户、数据库和业务一致性验证。
- `$backend-architecture-governance`：统一或调整后端架构、模块边界、分层职责、公共能力和跨模块规范。

## 标准执行顺序

完整后端需求按以下顺序推进：

1. `$backend-prd-analysis`
2. `$database-schema-design`，并把建表、字段增删改、索引、约束、必要初始化数据和维护数据 SQL 统一沉淀到 `dbsql/`
3. `$api-contract-design`
4. `$backend-feature-development`
5. `$backend-test-verification`

如果用户只要求其中一个阶段，只执行对应 skill；但发现前置设计缺失时，应先补齐必要分析再继续。

架构治理是横向流程，不替代上述主链路；当需求涉及项目结构、公共抽象或统一规范时，先用 `$backend-architecture-governance` 盘点和定方案，再进入具体阶段。

## 触发规则

- 用户提供 PRD、需求描述、业务流程、页面说明或“帮我分析怎么做”时，先用 `$backend-prd-analysis`。
- 用户提到表、字段、实体、数据库、索引、唯一约束、初始化数据、维护数据、权限数据、角色模板、字典、菜单、基础单位、迁移、TypeORM Entity 时，用 `$database-schema-design`。
- 用户提到接口、API、DTO、返回结构、Swagger、前后端联调、错误码、权限要求时，用 `$api-contract-design`。
- 用户要求“实现”“开发”“改代码”“加功能”“修 bug”时，用 `$backend-feature-development`；如果需求没有设计清楚，先回到分析/表设计/API 设计。
- 用户要求“测试”“验证”“检查”“能不能跑”“提交前看一下”时，用 `$backend-test-verification`。
- 用户提到“架构”“统一”“重构”“公共逻辑”“项目规范”“模块边界”“目录结构”“统一异常/响应/权限/租户/日志”时，用 `$backend-architecture-governance`。

## 组合规则

- 新功能从 0 到 1：PRD 分析 + 表结构设计 + API 契约设计 + 功能开发 + 测试验证。
- 只改接口不改表：API 契约设计 + 功能开发 + 测试验证。
- 只改数据库结构：表结构设计 + `dbsql/` SQL 沉淀 + 功能开发 + 测试验证。
- 修业务 bug：PRD/现状分析 + 功能开发 + 测试验证。
- 架构统一或横向重构：架构治理 + 分阶段开发 + 测试验证。
- 涉及库存、订单、导入、权限、多租户、事务时，不要直接写代码；先明确业务规则和验证标准。

## DB SQL 目录要求

- 所有人工维护的数据库 SQL 统一放在项目根目录 `dbsql/`。
- `dbsql/init-schema.sql` 维护当前初始化建表 SQL。
- 建表、新增字段、删除字段、修改字段、索引、唯一约束等结构变更 SQL 放在 `dbsql/`，建议命名为 `YYYYMMDDHHMM_业务说明_schema.sql`。
- 权限、角色模板、字典、菜单、基础单位、初始化数据、维护数据等数据 SQL 放在 `dbsql/`，建议命名为 `YYYYMMDDHHMM_业务说明_data.sql`。
- DB 设计阶段必须识别系统运行所需的基础数据，不要把必要初始化数据散落在临时代码、接口调用或人工操作步骤里。
- 删除字段、删数据、改字段类型等高风险操作，应同时提供 `YYYYMMDDHHMM_业务说明_rollback.sql` 或在 SQL 头部写明回滚方案。
- TypeORM migration 可以继续放在 `src/database/migrations/`；但 PRD 产生的人工 SQL 设计、初始化数据和维护数据必须同步沉淀到 `dbsql/`。

## 执行要求

- 每次使用 skill 前，先读取对应 `SKILL.md`。
- 不要把 skill 当成一次性文档；要按当前任务阶段选择最小必要 skill。
- 阶段之间的信息要传递清楚：PRD 分析产物应支持表设计，表设计和 API 契约应支持开发，开发结果应支持测试验证。
- 如果用户没有明确要求写代码，但处于分析或设计阶段，不要擅自实现。
- 如果用户明确要求实现，且设计信息足够，应完成代码修改并进行验证。

## 输出要求

- 分析阶段输出后端范围、数据模型、接口清单、业务规则、风险和验收标准。
- 表设计阶段输出表、字段、索引、约束、实体关系、`dbsql/` 文件清单、migration 影响和兼容风险。
- API 设计阶段输出接口清单、DTO、返回结构、错误场景、权限和租户来源。
- 开发阶段输出修改文件、关键实现和验证命令。
- 验证阶段输出执行了哪些命令、结果、未覆盖项和剩余风险。
- 架构治理阶段输出现状、不一致点、目标架构、分阶段改造计划、影响范围和验证方式。
