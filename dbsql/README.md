# dbsql 目录规范

本目录统一存放项目数据库相关 SQL，包括空库初始化、新增表、旧表结构变更、初始化数据、维护数据和回滚脚本。

## 目录职责

- `init/`：空库初始化脚本，只放完整建表 SQL，例如 `init-schema.sql`。
- `create-table/`：新增表脚本，例如新增部门表、岗位表、业务单据表。
- `alter-table/`：旧表结构升级脚本，例如已有表加字段、改字段、加索引、补约束。
- `init-data/`：初始化数据和维护数据脚本，例如权限、菜单、角色模板、字典、基础单位、平台默认配置。
- `rollback/`：回滚脚本，只在升级失败并且代码也回退时使用。

## 文件类型

- `init/init-schema.sql`：当前项目空库完整建表 SQL。
- `create-table/*_update.sql`：旧库新增表 SQL。
- `alter-table/*_update.sql`：旧库已有表结构升级 SQL。
- `init-data/*_data.sql`：初始化数据或维护数据 SQL。
- `rollback/*_rollback.sql`：高风险变更对应回滚 SQL。

## 场景规范

### 空库初始化

空库只负责把一个全新的数据库初始化到“当前最新可运行状态”。

- 必须先在数据库工具里选中目标库，或先执行 `USE 数据库名;`。
- 只执行 `init/init-schema.sql` 和必要的 `init-data/*_data.sql`。
- `init/init-schema.sql` 必须包含当前最新完整表结构，不要依赖历史 `create-table/*_update.sql` 或 `alter-table/*_update.sql` 才能建成新库。
- 空库建完表后，不要再执行历史结构升级脚本，避免重复加字段、重复建表或重复建索引。
- 空库需要的系统默认账号、角色、权限、菜单、字典等初始化数据，放在对应 `init-data/*_data.sql`，不能靠接口手动点出来。

推荐顺序：

```text
1. 选择目标数据库，例如 USE wms_dev;
2. init/init-schema.sql
3. 当前需要的初始化数据脚本，例如 init-data/202605191700_admin_permission_init_data.sql
```

### 旧库新增表

旧库新增表用于“已有数据库”补充全新的业务表。

- 必须放在 `create-table/`。
- 必须新建一个 `YYYYMMDDHHMM_业务说明_update.sql`。
- 脚本里允许带少量与新表强相关的权限/菜单挂载，但大批量初始化数据仍应放到 `init-data/`。
- 建表必须写完整字段注释、主键、必要索引和唯一约束。
- 新增表也必须同步到 `init/init-schema.sql`，保证空库能一次建到最新结构。
- 高风险新增表如果影响旧业务，必须配套 `rollback/YYYYMMDDHHMM_业务说明_rollback.sql`。

推荐文件：

```text
create-table/202605231100_department_post_update.sql
rollback/202605231100_department_post_rollback.sql
```

### 旧库改表 / 加字段

旧库改表用于“已有数据库”的已有表加字段、改字段、加索引、加约束。

- 必须放在 `alter-table/`。
- 必须新建一个 `YYYYMMDDHHMM_业务说明_update.sql`。
- 执行前必须备份数据库。
- 加字段、加索引、建表尽量写成可重复执行的幂等脚本。
- 已存在字段不要直接 `ADD COLUMN`，优先通过 `information_schema.COLUMNS` 判断后再执行。
- 修改字段类型、删除字段、删除索引、删除表属于高风险变更，必须在文件开头说明风险和影响范围。
- 高风险结构升级必须配套 `rollback/YYYYMMDDHHMM_业务说明_rollback.sql`。
- update 脚本只处理结构，不写大量初始化数据；数据放到同时间戳或同业务名的 `init-data/*_data.sql`。

推荐文件：

```text
alter-table/202605191700_admin_permission_model_update.sql
rollback/202605191700_admin_permission_model_rollback.sql
```

### 初始化数据 / 维护数据更新

初始化数据更新用于写入或修正系统必须存在的数据。

- 必须放在 `init-data/`。
- 必须新建一个 `YYYYMMDDHHMM_业务说明_data.sql`，或追加到同一业务已有的 data 脚本。
- 数据脚本要尽量幂等，优先使用 `INSERT ... ON DUPLICATE KEY UPDATE`、`INSERT IGNORE`、`UPDATE ... WHERE`。
- 权限、菜单、角色模板、平台默认用户、字典、基础单位、默认配置都属于初始化数据。
- 租户级初始化数据必须说明 `tenantId` 来源，不能随意写死业务租户。
- 删除数据前必须确认是否为系统初始化数据；高风险删除要提供回滚或恢复方式。
- data 脚本可以在空库和旧库执行，但必须依赖对应表结构已经存在。

推荐文件：

```text
init-data/202605191700_admin_permission_init_data.sql
```

### 回滚脚本

回滚脚本只在“升级失败并且代码也回退”时使用，不是日常修复脚本。

- 必须放在 `rollback/`。
- 命名必须与 update 脚本对应：`YYYYMMDDHHMM_业务说明_rollback.sql`。
- 回滚脚本要写清楚会删除哪些字段、表、索引或数据。
- 会造成数据丢失的回滚，必须在文件开头明确提示。
- 已经被新版本业务写入的数据，不要轻易通过 rollback 删除，优先人工评估。

## 命名建议

新增 SQL 文件优先使用以下格式：

```text
YYYYMMDDHHMM_业务说明_update.sql
YYYYMMDDHHMM_业务说明_data.sql
YYYYMMDDHHMM_业务说明_rollback.sql
```

示例：

```text
202605191030_add_product_batch_update.sql
202605191030_add_product_batch_data.sql
202605191030_add_product_batch_rollback.sql
```

放置目录按职责决定：

```text
init/init-schema.sql
create-table/YYYYMMDDHHMM_业务说明_update.sql
alter-table/YYYYMMDDHHMM_业务说明_update.sql
init-data/YYYYMMDDHHMM_业务说明_data.sql
rollback/YYYYMMDDHHMM_业务说明_rollback.sql
```

## 编写要求

- 每个 SQL 文件开头写明用途、来源需求、影响范围和执行环境。
- 文件名必须能看懂业务目的，不只写 `update`、`fix`、`temp`。
- 时间戳用于排序，不代表必须按文件创建时间盲目执行；以 README 的执行顺序和脚本注释为准。
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
1. 选择目标数据库，例如 USE wms_dev;
2. init/init-schema.sql
3. init-data/202605191700_admin_permission_init_data.sql
4. init-data/202605231400_common_dictionary_data.sql
5. init-data/202605231430_department_post_init_data.sql
```

旧库升级：

```text
1. 备份数据库
2. 选择目标数据库，例如 USE wms_dev;
3. alter-table/202605191700_admin_permission_model_update.sql
4. init-data/202605191700_admin_permission_init_data.sql
5. alter-table/202605201530_platform_menu_tree_update.sql
6. create-table/202605231100_department_post_update.sql
7. alter-table/202605231500_user_role_org_permission_update.sql
8. init-data/202605231400_common_dictionary_data.sql
9. init-data/202605231430_department_post_init_data.sql
```

升级失败并且代码也回退时，才考虑执行对应的 `*-rollback.sql`。

初始化数据更新：

```text
1. 确认目标表结构已经存在
2. 执行对应的 init-data/*_data.sql
3. 检查关键数据是否写入，例如权限 code、角色、菜单、字典项
```

## 已知执行问题

### 1273 - Unknown collation: `utf8mb4_0900_ai_ci`

原因：`utf8mb4_0900_ai_ci` 是 MySQL 8 常见排序规则，MySQL 5.7 或部分 MariaDB 不支持。

处理：本目录 SQL 已统一改为 `utf8mb4_unicode_ci`。如果复制旧 SQL 执行，先替换：

```sql
utf8mb4_0900_ai_ci -> utf8mb4_unicode_ci
```

### 1060 - Duplicate column name

原因：重复执行结构升级脚本，或已经执行过 `init/init-schema.sql` 后又执行 `create-table/*_update.sql` 或 `alter-table/*_update.sql`。

处理：

- 空库建表后不要再执行 `alter-table/202605191700_admin_permission_model_update.sql`，只执行 `init-data/202605191700_admin_permission_init_data.sql`。
- `alter-table/202605191700_admin_permission_model_update.sql` 已改成幂等脚本，字段已存在会自动跳过。

### 外键字段类型不一致

原因：MySQL 创建外键时要求引用字段和被引用字段类型、长度、字符集/排序规则兼容。

已处理：

- `inventory_locations.locationId` 与 `locations.id` 统一为 `char(36)`。
- 常见 UUID 字段如 `tenantId`、`locationId`、`unitId`、`deviceId` 已在 `init/init-schema.sql` 中统一为 `char(36)`。

### update / data / rollback 不要混用

- `init/init-schema.sql`：新库完整建表。
- `create-table/*_update.sql`：旧库新增表。
- `alter-table/*_update.sql`：旧库已有表改结构。
- `init-data/*_data.sql`：写入初始化数据。
- `rollback/*_rollback.sql`：撤销对应结构升级，只有回退版本时使用。

### 1046 - No database selected

原因：执行 SQL 前没有选中目标数据库。

处理：先在数据库工具中选择目标库，或执行：

```sql
USE wms_dev;
```

再执行本目录 SQL。通用 SQL 文件里不固定写死 `USE wms_dev;`，避免测试、生产环境误执行到错误数据库。
