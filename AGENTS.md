# M-WMS Backend Agent 协议

## 项目定位

- 本项目是多租户仓库管理系统后端，技术栈为 NestJS 11、TypeORM 0.3、MySQL 8、JWT、Passport、class-validator、Swagger。
- 主要业务位于 `src/modules/`，包括租户、认证、用户、角色、库存、订单、库位、产品、单位、上传、通知、门户、Redis 等模块。
- 通用能力位于 `src/common/`，配置位于 `src/config/`，数据库基类和迁移位于 `src/database/`。
- 后端分端 PRD 位于 `docs/prd/`；开始需求开发前，优先读取对应 PRD。

## Agent 工作原则

- 默认使用中文交流，除非用户明确要求其他语言。
- 修改前先阅读相关 controller、service、entity、dto、module 和已有调用方。
- 优先沿用现有代码风格、接口形态、目录结构和命名方式。
- 只修改与当前任务直接相关的文件，不做无关重构。
- 涉及接口兼容、数据库结构、权限、多租户隔离、迁移或生产配置时，需要主动说明风险。
- 不回滚、不覆盖用户未明确要求处理的改动。

## 推荐 Skills

- 从 PRD、产品说明或业务描述拆后端任务时，使用 `$backend-prd-analysis`。
- 需要设计或调整数据库表结构、字段、索引、唯一约束、实体关系、必要初始化数据、维护数据和 migration 时，使用 `$database-schema-design`，并将相关 SQL 统一放到 `dbsql/`。
- 需要设计接口路径、DTO、返回结构、错误场景、Swagger、权限和前后端联调契约时，使用 `$api-contract-design`。
- 按设计进行 NestJS 后端开发时，使用 `$backend-feature-development`。
- 功能完成后进行构建、测试、lint、接口、多租户、权限、数据库和业务一致性验证时，使用 `$backend-test-verification`。
- 需要统一或调整后端架构、模块边界、目录结构、公共能力、异常、响应、日志、权限、多租户或配置规范时，使用 `$backend-architecture-governance`。
- 一个完整后端需求通常按 `$backend-prd-analysis` -> `$database-schema-design` -> `$api-contract-design` -> `$backend-feature-development` -> `$backend-test-verification` 的顺序推进。
- 架构治理是横向流程，不替代主交付链路；涉及统一规范或重构时，应先治理架构，再进入具体开发和验证。

## 包管理与常用命令

- 优先使用 `pnpm`，因为项目包含 `pnpm-lock.yaml`。
- 常用命令：
  - `pnpm install`
  - `pnpm run start:dev`
  - `pnpm run build`
  - `pnpm run lint`
  - `pnpm run test`
  - `pnpm run test:cov`
  - `pnpm run test:e2e`
  - `pnpm run migration:run`
  - `pnpm run migration:revert`
  - `pnpm run seed`
- `pnpm run lint` 会自动修复文件，运行前注意工作区是否存在用户改动。
- 搜索文件和文本优先使用 `rg` / `rg --files`。
- 手动编辑文件优先使用 `apply_patch`。

## 格式化规范

- 遵循 `.prettierrc`：
  - 使用单引号。
  - 保留分号。
  - 缩进为 2 个空格。
  - 最大行宽 100。
  - 对象、数组、参数列表允许尾随逗号。
  - 箭头函数参数始终带括号。
- 遵循 `.eslintrc.js`：
  - 删除未使用的 import。
  - 未使用变量如确需保留，应使用 `_` 前缀。
  - 允许 `any`，但只有在三方库、动态 JSON、历史接口兼容等场景下使用。
- 不要为了格式化而大面积改动无关文件。

## TypeScript 代码规范

- 优先写明确、直接、可读的 TypeScript，不引入过度抽象。
- 能推导的简单返回类型可省略；公共方法、复杂对象、跨模块返回结构建议显式声明类型或 DTO。
- 避免魔法字符串散落，通用枚举、权限、状态值优先放到 `src/common/constants/` 或模块内常量。
- 避免在 service 中返回包含密码、密钥、Token 等敏感字段。
- 避免在业务代码中使用裸 `console.log`；已有调试日志如需新增，应控制范围，任务完成前清理无用日志。
- 优先使用 `async/await`，不要混用 Promise 链式写法。
- 捕获异常时不要吞掉错误；需要转换业务错误时使用项目已有异常结构。

## NestJS 分层规范

- `controller` 只处理路由、参数获取、权限装饰器、Swagger 描述和调用 service。
- `service` 承载业务逻辑、数据库操作、事务、租户隔离校验和外部服务调用。
- `dto` 只描述入参、查询参数或明确的返回结构，不写业务逻辑。
- `entity` 只描述数据库结构和关系，不写复杂业务方法。
- `module` 负责依赖注册，新增 provider/entity/controller 后必须检查对应 module 是否注册。
- 新模块优先使用以下结构：
  - `src/modules/<module>/<module>.module.ts`
  - `src/modules/<module>/<module>.controller.ts`
  - `src/modules/<module>/<module>.service.ts`
  - `src/modules/<module>/dto/*.dto.ts`
  - `src/modules/<module>/entities/*.entity.ts`

## Controller 规范

- 路由风格优先保持现有项目习惯，例如 `page`、`save`、`update`、`detail`、`delete`、`status`。
- 新增接口前必须先判断调用方类型：管理端 Admin API、官网 Portal API、小程序 Miniapp API、服务器调用 Open API。
- 管理端接口主要服务 `my-wms`，优先使用 JWT 登录态，从 `req.user.tenantId` 获取租户，后续需要接 RBAC 权限码。
- 管理端内部再分为平台域和租户域：
  - 平台域用于超级管理员，路径建议为 `/admin/platform/*`，负责租户、平台菜单、平台角色、平台用户和平台配置。
  - 租户域用于租户管理员和租户员工，路径建议为 `/admin/tenant/*`，负责本租户员工、角色、菜单和业务数据。
- 官网接口主要服务 `portal-websits`，建议统一放在 `/portal/:domain/*`，通过 `domain` 解析租户，不信任前端传入的 `tenantId`。
- 小程序接口建议统一放在 `/miniapp/*`，使用小程序登录态或用户绑定关系确定租户，不直接复用管理端账号密码接口。
- 服务器调用接口建议统一放在 `/open/v1/*`，使用服务端 appKey/appSecret、签名、时间戳、nonce 或专用 token，不使用前端 JWT。
- 已登录接口从 `req.user` 获取用户信息，租户 ID 优先使用 `req.user.tenantId`。
- 公开接口必须使用 `@Public()`，并对 `tenantId`、`id` 等关键参数做显式校验。
- 需要 Bearer Token 的 controller 保持 `@ApiBearerAuth()`。
- 新增接口尽量补充 `@ApiTags()`、`@ApiOperation()`、必要的 `@ApiBody()` / `@ApiResponse()`。
- 文件下载、上传等特殊响应可以使用 `@Res()`，普通 JSON 接口不要直接操作 response。
- 列表接口如需禁用缓存，可沿用已有 `Cache-Control`、`Pragma`、`Expires` header 写法。

## DTO 与参数校验规范

- DTO 使用 `class-validator` 表达入参约束，配合全局 `ValidationPipe`。
- 字符串字段优先加 `@IsString()` 和合适的 `@MaxLength()`。
- 可选字段加 `@IsOptional()`，不要只依赖 TypeScript 的 `?`。
- 数字字段按语义使用 `@IsInt()`、`@IsNumber()`、`@Min()`、`@Max()`。
- 枚举字段使用 `@IsEnum()`，不要只写字符串注释。
- 数组字段使用 `@IsArray()`，必要时配合 `@ValidateNested()` 和 `@Type()`。
- DTO 中不要包含服务端可信字段，例如普通业务接口不应让客户端传入 `tenantId`、`createdAt`、`updatedAt`。
- Swagger 文档使用 `@ApiProperty()` / `@ApiPropertyOptional()`，描述要贴近前端实际使用。

## Service 业务规范

- 所有租户业务查询必须带 `tenantId` 条件。
- 新增租户业务数据必须写入 `tenantId`。
- 更新、删除、详情查询必须同时校验 `id` 和 `tenantId`，避免跨租户访问。
- 业务错误优先使用 `BusinessException`，保持项目统一响应结构。
- 系统级资源不存在可使用 NestJS 内置异常，如 `NotFoundException`，但同一模块内应尽量保持一致。
- 分页返回结构优先保持 `{ list, total, page, pageSize }`。
- 查询列表默认排序优先使用已有模块习惯；无明确要求时优先按 `createdAt` 倒序。
- 密码必须使用 bcrypt/bcryptjs hash 后保存，禁止明文落库。
- 不要在 service 中直接信任客户端传来的权限、角色、租户归属等敏感字段。

## 数据库与 TypeORM 规范

- PRD 下来后，数据库设计阶段必须先明确表结构、字段增删改、索引、唯一约束、必要初始化数据和维护数据，再进入 API 与开发。
- 实体通常继承 `BaseEntity` 或 `TenantBaseEntity`：
  - `BaseEntity` 提供 `id`、`createdAt`、`updatedAt`、`deletedAt`。
  - `TenantBaseEntity` 额外提供 `tenantId`。
- MySQL JSON 字段使用 `type: 'json'`，不要使用 PostgreSQL 专属类型如 `jsonb`。
- decimal 字段返回时注意 TypeORM/MySQL 可能给出字符串，涉及计算或前端展示时要显式转换。
- 涉及租户隔离的唯一约束应包含 `tenantId`，例如 `@Unique(['tenantId', 'code'])`。
- 关系查询要明确 `relations` 或 QueryBuilder join，不要依赖隐式加载。
- 复杂筛选、聚合、关联列表优先使用 QueryBuilder，并确保所有 join 条件考虑租户边界。
- 删除业务数据优先考虑软删除；项目已有 `DeleteDateColumn` 和 `softRemove` 写法。
- 如果使用硬删除，要确认不会破坏业务轨迹或关联数据。
- 修改实体字段后必须评估 `dbsql/` SQL 和 migration，不允许依赖 `synchronize`。
- 项目禁止使用 `DB_SYNCHRONIZE=true` 自动创建或修改表结构；运行时配置强制 `synchronize: false`。
- 所有人工维护的数据库 SQL 统一放在 `dbsql/`：
  - 初始化建表 SQL：`dbsql/init-schema.sql`。
  - 建表、新增字段、删除字段、修改字段、索引、约束：`dbsql/YYYYMMDDHHMM_业务说明_schema.sql`。
  - 初始化数据、维护数据、权限、角色模板、字典、菜单、基础单位：`dbsql/YYYYMMDDHHMM_业务说明_data.sql`。
  - 删除字段、删除数据、修改字段类型等高风险操作：提供 `dbsql/YYYYMMDDHHMM_业务说明_rollback.sql` 或写明回滚方案。
- DB 设计阶段负责识别系统运行所需的基础数据，包括权限、角色模板、字典、菜单、基础单位、平台默认配置等，并产出幂等 data SQL。
- TypeORM migration 可以继续放在 `src/database/migrations/`，但 PRD 产生的人工 SQL 方案、初始化数据和维护数据必须同步沉淀到 `dbsql/`。

## 事务规范

- 涉及多表写入、库存扣减、订单创建、导入批处理、状态流转时，应优先考虑事务。
- 使用 `DataSource.transaction()` 或 QueryRunner 时，事务内必须使用事务 manager/repository。
- 库存数量、出入库流水、订单状态等强一致业务，不要拆成无事务的多次独立 save。
- 捕获事务异常后应保留原始错误信息或转换为明确的业务异常，避免返回模糊错误。

## 多租户与权限规范

- 默认所有业务数据都属于某个租户，除平台级配置、平台管理员等明确例外。
- 控制器不要从普通请求体读取 `tenantId` 作为可信租户来源。
- 公开第三方接口允许传 `tenantId` 时，必须显式校验并只开放必要数据。
- 权限常量和角色模板优先维护在 `src/common/constants/`。
- 新增受保护接口时，检查是否需要权限守卫、权限码、角色模板或菜单侧配置。
- 平台管理员逻辑与租户管理员逻辑要区分清楚，不要把 `tenantId = null` 的数据混入普通租户查询。
- 平台超级管理员属于平台域，`tenantId` 可以为空，只能默认操作平台资源和租户管理资源。
- 平台超级管理员如需查看或处理某个租户业务数据，必须设计明确的“代管/切换租户”上下文，不能让平台接口默认跨租户混查。
- 租户管理员属于租户域，只能管理本租户员工、租户角色、租户菜单和本租户业务数据。
- 租户员工属于租户域，只能按角色权限访问本租户业务数据。
- 角色、菜单、权限建议区分 `scope`：`platform` 表示平台域，`tenant` 表示租户域；租户域数据必须带 `tenantId`。
- 权限码建议按域名前缀拆分，例如 `platform:tenant:list`、`platform:role:list`、`tenant:user:list`、`tenant:inventory:outbound`。

## 异常与响应规范

- 全局响应由 `TransformInterceptor` 处理，不要在普通接口手动包一层统一响应。
- 业务失败优先抛 `BusinessException`，错误信息使用中文且面向前端/用户可理解。
- 参数缺失、非法状态、重复数据、跨租户访问等要给出明确错误。
- 不要把数据库错误、堆栈、SQL、密钥等敏感信息直接返回给前端。
- 导入类接口可以返回成功/失败统计；部分失败时沿用现有 `BusinessException(message, code, details)` 风格。

## 外部服务与文件规范

- OSS、短信、Redis、上传、Excel 相关配置必须来自环境变量或配置模块，不要硬编码。
- 上传接口要注意文件大小、MIME 类型、扩展名、空文件和异常处理。
- Excel 导入要校验表头、必填字段、重复数据、租户边界和错误明细。
- Redis key 应包含业务前缀，涉及租户数据时包含 tenantId，避免不同租户冲突。

## 测试与验证规范

- 普通后端代码改动后优先运行：
  - `pnpm run build`
  - `pnpm run test`
  - `pnpm run lint`
- 单模块改动时，优先补充或更新对应 `*.spec.ts`。
- 涉及控制器、守卫、拦截器、认证流程、数据库事务的改动，应考虑单元测试或 e2e 测试。
- 只改文档时可不运行测试，但最终回复必须说明未运行测试。
- 涉及数据库、迁移、Redis、OSS、短信或上传的改动，如果本地环境无法完整验证，最终回复要明确未覆盖的部分。

## Git 与安全边界

- 可以存在用户自己的未提交改动，必须避免覆盖。
- 不使用 `git reset --hard`、`git checkout --` 等破坏性命令，除非用户明确要求。
- 不提交真实密钥、Token、数据库密码、生产环境敏感配置。
- 不随意修改 `pnpm-lock.yaml`，除非确实变更了依赖。
- 不随意删除上传目录、迁移文件、环境文件或用户生成的数据。

## 最终回复规范

- 简要说明完成了什么、修改了哪些文件。
- 说明运行过哪些验证命令，以及结果。
- 如果存在未验证项、迁移风险、环境变量要求或兼容性影响，必须明确指出。
