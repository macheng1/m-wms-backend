# M-WMS Backend

多租户仓库管理系统（WMS）后端服务，基于 NestJS + TypeORM + MySQL 构建。

## 项目特性

- 🏢 **多租户架构** - 支持 SaaS 多租户隔离
- 🔐 **JWT 认证** - 基于 JWT 的用户认证和授权
- 📦 **模块化设计** - 清晰的业务模块划分
- 🗄️ **数据库迁移** - TypeORM 迁移和种子数据支持
- 🌍 **多环境配置** - 支持 dev/test/uat/prod 环境
- 🐳 **Docker 支持** - 完整的 Docker 和 Docker Compose 配置
- 🛡️ **全局异常处理** - 统一的异常过滤器
- 📝 **请求日志** - 自动记录请求和响应
- ✅ **数据验证** - 基于 class-validator 的自动验证

## 项目结构

```
m-wms-backend/
├── src/
│   ├── common/                 # 全局通用逻辑
│   │   ├── filters/            # 异常过滤器
│   │   ├── interceptors/       # 响应拦截器
│   │   ├── middleware/         # SaaS 租户解析中间件
│   │   └── decorators/         # 自定义装饰器
│   ├── config/                 # 配置文件
│   │   ├── app.config.ts       # 应用配置
│   │   ├── database.config.ts  # 数据库配置
│   │   ├── jwt.config.ts       # JWT 配置
│   │   └── typeorm.config.ts   # TypeORM 配置（用于迁移）
│   ├── modules/                # 业务模块
│   │   ├── tenant/             # 租户管理
│   │   ├── auth/               # 认证授权
│   │   ├── inventory/          # 库存管理
│   │   └── order/              # 订单管理
│   ├── database/               # 数据库相关
│   │   ├── migrations/         # 数据库迁移文件
│   │   └── seeds/              # 种子数据
│   ├── app.module.ts           # 根模块
│   └── main.ts                 # 应用入口
├── envs/                       # 环境变量文件
│   ├── .env.development
│   ├── .env.test
│   ├── .env.uat
│   └── .env.production
├── Dockerfile                  # 生产环境镜像
├── docker-compose.yml          # 本地开发环境
├── package.json
└── tsconfig.json
```

## 技术栈

- **框架**: NestJS 11
- **数据库**: MySQL 8.0 + TypeORM 0.3
- **认证**: JWT + Passport
- **验证**: class-validator + class-transformer
- **语言**: TypeScript 5

## 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8
- MySQL >= 8.0
- Docker & Docker Compose (可选)

### 安装依赖

```bash
pnpm install
```

### 环境配置

根据需要修改 `envs/.env.development` 文件中的配置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=password
DB_DATABASE=wms_dev
```

### 数据库初始化

```bash
# 运行迁移
npm run migration:run

# 或者使用同步模式（仅开发环境）
# 设置 DB_SYNCHRONIZE=true
```

### 启动开发服务器

```bash
# 开发环境
npm run start:dev

# 测试环境
npm run start:test

# UAT 环境
npm run start:uat
```

应用将在 http://localhost:3000 启动

### 使用 Docker Compose

```bash
# 启动所有服务（MySQL + Backend）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 可用脚本

```bash
# 开发
npm run start:dev          # 开发模式（热重载）
npm run start:test         # 测试环境
npm run start:uat          # UAT 环境
npm run start:prod         # 生产环境

# 构建
npm run build              # 构建生产版本

# 代码质量
npm run lint               # 代码检查
npm run format             # 代码格式化

# 测试
npm run test               # 单元测试
npm run test:watch         # 监听模式
npm run test:cov           # 测试覆盖率
npm run test:e2e           # E2E 测试

# 数据库
npm run migration:generate -- src/database/migrations/MigrationName  # 生成迁移
npm run migration:run      # 运行迁移
npm run migration:revert   # 回滚迁移
npm run seed               # 运行种子数据
```

## API 端点

### 租户管理
- `POST /api/tenants` - 创建租户
- `GET /api/tenants` - 获取租户列表
- `GET /api/tenants/:id` - 获取租户详情
- `PATCH /api/tenants/:id` - 更新租户
- `DELETE /api/tenants/:id` - 删除租户

### 认证授权
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 库存管理
- `POST /api/inventory` - 创建库存
- `GET /api/inventory` - 获取库存列表
- `GET /api/inventory/:id` - 获取库存详情
- `PATCH /api/inventory/:id` - 更新库存
- `DELETE /api/inventory/:id` - 删除库存

### 订单管理
- `POST /api/orders` - 创建订单
- `GET /api/orders` - 获取订单列表
- `GET /api/orders/:id` - 获取订单详情
- `PATCH /api/orders/:id` - 更新订单
- `DELETE /api/orders/:id` - 删除订单

## 多租户使用

所有需要租户隔离的请求都需要在请求头中携带 `x-tenant-id`：

```bash
curl -X GET http://localhost:3000/api/inventory \
  -H "x-tenant-id: tenant-uuid" \
  -H "Authorization: Bearer your-jwt-token"
```

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t wms-backend .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-password \
  --name wms-backend \
  wms-backend
```

### 生产环境

1. 修改 `envs/.env.production` 配置
2. 构建应用：`npm run build`
3. 运行迁移：`npm run migration:run`
4. 启动应用：`npm run start:prod`

## 开发指南

### 创建新模块

```bash
nest g module modules/your-module
nest g controller modules/your-module
nest g service modules/your-module
```

### 创建数据库迁移

```bash
npm run migration:generate -- src/database/migrations/YourMigration
```

### 添加新环境

1. 在 `envs/` 目录创建 `.env.{environment}` 文件
2. 在 `package.json` 中添加对应的启动脚本

## 许可证

MIT

## 作者

Your Name
