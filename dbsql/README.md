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

## 执行顺序

空库初始化：

```text
1. init-schema.sql
2. 202605191700_admin_scope_data.sql
```

旧库升级：

```text
1. 备份数据库
2. 202605191700_admin_scope_schema.sql
3. 202605191700_admin_scope_data.sql
```

升级失败并且代码也回退时，才考虑执行对应的 `*-rollback.sql`。

## 已知执行问题

### 1273 - Unknown collation: `utf8mb4_0900_ai_ci`

原因：`utf8mb4_0900_ai_ci` 是 MySQL 8 常见排序规则，MySQL 5.7 或部分 MariaDB 不支持。

处理：本目录 SQL 已统一改为 `utf8mb4_unicode_ci`。如果复制旧 SQL 执行，先替换：

```sql
utf8mb4_0900_ai_ci -> utf8mb4_unicode_ci
```

### 1060 - Duplicate column name

原因：重复执行结构升级脚本，或已经执行过 `init-schema.sql` 后又执行 `*-schema.sql`。

处理：

- 空库建表后不要再执行 `202605191700_admin_scope_schema.sql`，只执行 `202605191700_admin_scope_data.sql`。
- `202605191700_admin_scope_schema.sql` 已改成幂等脚本，字段已存在会自动跳过。

### 外键字段类型不一致

原因：MySQL 创建外键时要求引用字段和被引用字段类型、长度、字符集/排序规则兼容。

已处理：

- `inventory_locations.locationId` 与 `locations.id` 统一为 `char(36)`。
- 常见 UUID 字段如 `tenantId`、`locationId`、`unitId`、`deviceId` 已在 `init-schema.sql` 中统一为 `char(36)`。

### schema / data / rollback 不要混用

- `init-schema.sql`：新库建表。
- `*-schema.sql`：旧库升级结构。
- `*-data.sql`：写入初始化数据。
- `*-rollback.sql`：撤销对应结构升级，只有回退版本时使用。
