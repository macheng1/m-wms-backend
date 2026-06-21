# 数据库变更记录（CHANGELOG）

记录每一次数据库结构 / 初始化数据的变更，以及在各环境的同步状态。

## 工作流（以 dev 为准）

1. **所有改动先在 dev 上做**：新增表、加字段、改字段、补初始化数据，统一写成带时间戳的 SQL，放进 `dbsql/dev/` 对应目录：
   - 新增表 → `dev/create-table/YYYYMMDDHHMM_业务说明_update.sql`
   - 改表/加字段 → `dev/alter-table/YYYYMMDDHHMM_业务说明_update.sql`
   - 初始化/维护数据 → `dev/init-data/YYYYMMDDHHMM_业务说明_data.sql`
   - 高风险变更同时写 `dev/rollback/YYYYMMDDHHMM_业务说明_rollback.sql`
2. **在 dev 库执行该脚本**，确认无误后，在下方变更表登记一行，`dev` 标 ✅。
3. **要上 UAT 时**：把待同步（`dev=✅` 且 `uat=⬜`）的脚本**按时间顺序**复制到 `dbsql/uat/` 同名目录并在 UAT 库执行，然后把对应行的 `uat` 改成 ✅。
4. 变更稳定后，建议定期用活库重新导出基准：刷新 `dev/init/` 与 `uat/init/` 的 `init-schema.sql` + `init-data.sql`（命令见文末）。

> 📌 **“该往 UAT 执行哪些”** = 下表中 `dev=✅` 且 `uat=⬜` 的行，按日期从上到下依次执行。

## 变更表

| 日期 | 变更摘要 | 涉及表 | 脚本 | dev | uat |
|------|----------|--------|------|:---:|:---:|
| 2026-06-21 | 基线建立：以 dev 活库为准导出 45 表完整结构 + 初始化数据，建立 `init/` 基准 | 全部 45 表 | `dev/init/init-schema.sql`、`dev/init/init-data.sql` | ✅ | ✅ |
| 2026-06-21 | 补齐代码所需的 53 个缺失字段（手动同步漏补） | users(deptId,postId)、orders(source,orderType,stockLocked,customer*,…)、inventory(lockedQuantity,lastSource,lastOperator*)、inventory_transactions(source,operator*)、permissions(scope,routePath,…)、roles(scope,dataScope)、tenants(tenantSource,isApproved,lifecycleStatus,…)、dictionaries(scope,isSystem,…)、products(barcode,unitId,description)、portal_configs(homeConfig)、devices(deviceUid) | （增量 ADD COLUMN，已并入 init/init-schema.sql 基准） | ✅ | ✅ |
| 2026-06-21 | 平台超管角色 scope 修正为 platform | roles | （数据修正，已并入 init/init-data.sql 基准） | ✅ | ✅ |

<!-- 新增变更复制下面这行模板，填好后置于表格最后一行：
| YYYY-MM-DD | 一句话说明本次新增了什么 | 涉及表(列) | dev/alter-table/xxx_update.sql | ✅ | ⬜ |
-->

## 待同步到 UAT

> 下面这些是 `dev` 已应用、`uat` 尚未应用的脚本，按顺序在 UAT 执行后，把上表对应行 `uat` 改成 ✅ 并从这里移除。

- （暂无，dev 与 uat 已对齐）

## 重新导出基准（活库 → init/ 基准文件）

变更累积后，可用活库重新生成 `init/` 基准（结构 + 初始化数据，业务表不导出）。生成脚本逻辑见提交历史；核心是 `SHOW CREATE TABLE` 导出全部表结构，按白名单 + `tenantId IS NULL` / 超管行过滤导出 seed 数据，输出到对应环境的 `init/init-schema.sql` 与 `init/init-data.sql`。
