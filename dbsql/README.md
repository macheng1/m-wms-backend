# dbsql 目录（按环境拆分）

本目录下的数据库 SQL **按环境拆成两棵独立的树**，dev 与 uat 各自维护，互不影响：

```text
dbsql/
  dev/    # 开发环境（wms_dev）
  uat/    # UAT 环境（wms_uat）
```

每棵树结构相同：

```text
<env>/
  init/
    init-schema.sql   # 该环境活库导出的完整建表 SQL（基础字段表）
    init-data.sql     # 该环境的初始化数据（除业务数据，幂等 INSERT IGNORE）
  create-table/       # 旧库新增表脚本
  alter-table/        # 旧库改表/加字段脚本
  init-data/          # 历史初始化/维护数据脚本（留档，新库初始化用 init/init-data.sql）
  rollback/           # 回滚脚本
  backups/            # 该环境执行前的整库备份
  README.md           # 该环境内的目录规范（命名/场景/已知问题等）
```

## 变更流程

**以 dev 为准**：所有结构/初始化数据改动先在 dev 上做并登记，要上 UAT 时再执行尚未同步的最新脚本。每次变更必须记录到 [`CHANGELOG.md`](./CHANGELOG.md)，并在其中跟踪 dev / uat 的同步状态——“该往 UAT 执行哪些”就看 CHANGELOG 里 `dev=✅ 且 uat=⬜` 的行。

## 使用约定

- **空库初始化**：进入对应环境目录，先选中目标库，再依次执行 `init/init-schema.sql` → `init/init-data.sql`。
- **结构/数据变更**：在对应环境的 `create-table/` `alter-table/` `init-data/` 下新增带时间戳的脚本，详见各环境内的 `README.md`。
- **两环境差异**：`init/` 基准分别从各自活库导出，会如实反映环境差异（例如 `products.unitId` 在 uat 为 `NOT NULL`、dev 为 `NULL`）。改动需要同步两端时，请分别在 dev/ 和 uat/ 下各加一份脚本。
- **备份**：高风险变更执行前的整库备份放在对应环境的 `backups/`，不要跨环境混用。

## 命名规范

变更脚本统一用时间戳前缀，放进对应环境目录：

```text
create-table/YYYYMMDDHHMM_业务说明_update.sql    # 新增表
alter-table/YYYYMMDDHHMM_业务说明_update.sql     # 改表/加字段
init-data/YYYYMMDDHHMM_业务说明_data.sql         # 初始化/维护数据
rollback/YYYYMMDDHHMM_业务说明_rollback.sql      # 高风险变更的回滚
```

- 文件名要能看懂业务目的，不要只写 `update`/`fix`/`temp`。
- 加字段、加索引尽量写成幂等脚本（先查 `information_schema` 再执行）；数据脚本优先 `INSERT IGNORE` / `INSERT ... ON DUPLICATE KEY UPDATE`。
- 改字段类型、删字段、删表属高风险，文件开头写明风险与影响，并配套 `rollback/`。
- 涉及租户数据时必须考虑 `tenantId`；平台级 seed 用 `tenantId IS NULL`。

## 已知执行问题

- **1046 No database selected**：执行前先 `USE wms_dev;` / `USE wms_uat;`。通用脚本不写死 `USE`，避免误执行到错误库。
- **1273 Unknown collation `utf8mb4_0900_ai_ci`**：MySQL 5.7/部分 MariaDB 不支持，统一改用 `utf8mb4_unicode_ci`。
- **1060 Duplicate column / 重复建表**：空库已用 `init/` 基准建全，不要再叠加历史升级脚本；加字段脚本写成幂等。
- **errno 150 外键约束**：禁止对被引用表做 `ALTER ... DROP PRIMARY KEY`（TypeORM `schema:sync` 会触发）。整库重建用 `SET FOREIGN_KEY_CHECKS=0` + 全 `CREATE`；增量同步只取 `ADD COLUMN/INDEX`，跳过主键 churn。
