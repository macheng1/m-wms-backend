# dbsql 目录规范

本目录统一存放项目数据库相关 SQL，包括初始化表结构、字段变更、删字段、索引调整、初始化数据和维护数据。

## 文件类型

- `init-schema.sql`：当前项目初始化建表 SQL。
- `*-schema.sql`：表结构变更 SQL，例如建表、新增字段、删除字段、修改字段、索引和约束调整。
- `*-data.sql`：初始化数据或维护数据 SQL，例如权限、角色模板、字典、菜单、基础单位、平台默认配置等。
- `*-rollback.sql`：高风险变更需要提供回滚 SQL。

## 命名建议

新增 SQL 文件优先使用以下格式：

```text
YYYYMMDDHHMM_业务说明_schema.sql
YYYYMMDDHHMM_业务说明_data.sql
YYYYMMDDHHMM_业务说明_rollback.sql
```

示例：

```text
202605191030_add_product_batch_schema.sql
202605191030_add_product_batch_data.sql
202605191030_add_product_batch_rollback.sql
```

## 编写要求

- 每个 SQL 文件开头写明用途、来源需求、影响范围和执行环境。
- 建表和字段变更要包含必要注释。
- 涉及租户业务数据时必须考虑 `tenantId`。
- 初始化/维护数据要尽量可重复执行，优先使用幂等写法。
- DB 阶段负责沉淀系统必要初始化数据，不要把权限、角色模板、字典、菜单、基础单位、平台默认配置等数据散落在临时代码、接口调用或人工步骤中。
- 初始化数据要说明归属范围：平台级、租户级或环境级；租户级数据必须明确 `tenantId` 来源。
- 删除字段、删除数据、修改字段类型等高风险操作必须说明风险，并提供回滚方案。
- TypeORM migration 可以继续放在 `src/database/migrations/`，但对应的人工 SQL 方案和维护 SQL 应沉淀到本目录。
- 禁止使用 `DB_SYNCHRONIZE=true` 自动创建或修改表结构；数据库变更必须通过本目录 SQL 和/或 TypeORM migration 管理。
