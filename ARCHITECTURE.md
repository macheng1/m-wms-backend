# WMS 后端系统架构图

## 系统整体架构

```mermaid
graph TB
    subgraph "客户端层 Client Layer"
        WEB[Web 前端应用]
        MOBILE[移动端应用]
        PORTAL[客户门户]
    end

    subgraph "API 网关层 API Gateway Layer"
        NGINX[Nginx 反向代理]
        GUARDS[JWT 认证守卫]
        RBAC[RBAC 权限控制]
        INTERCEPTOR[响应拦截器]
        FILTER[异常过滤器]
    end

    subgraph "业务逻辑层 Business Logic Layer"
        AUTH[AuthModule 认证模块]
        TENANT[TenantModule 租户模块]
        USER[UsersModule 用户模块]
        ROLE[RolesModule 角色权限模块]
        PRODUCT[ProductModule 产品模块]
        INVENTORY[InventoryModule 库存模块]
        ORDER[OrderModule 订单模块]
        PORTAL_MOD[PortalModule 门户模块]
        SYSTEM[SystemModule 系统模块]
        ALIYUN[AliyunModule 阿里云集成]
        UPLOAD[UploadModule 文件上传]
    end

    subgraph "数据访问层 Data Access Layer"
        REPO[TypeORM Repository]
        QUERY[Query Builder]
        MIGRATION[数据库迁移]
    end

    subgraph "数据存储层 Data Storage Layer"
        MYSQL[(MySQL 数据库)]
        CACHE[(Redis 缓存)]
    end

    subgraph "外部服务 External Services"
        OSS[阿里云 OSS]
        SMS[阿里云短信服务]
    end

    WEB --> NGINX
    MOBILE --> NGINX
    PORTAL --> NGINX

    NGINX --> GUARDS
    GUARDS --> RBAC
    RBAC --> INTERCEPTOR
    INTERCEPTOR --> FILTER

    FILTER --> AUTH
    FILTER --> TENANT
    FILTER --> USER
    FILTER --> ROLE
    FILTER --> PRODUCT
    FILTER --> INVENTORY
    FILTER --> ORDER
    FILTER --> PORTAL_MOD
    FILTER --> SYSTEM
    FILTER --> ALIYUN
    FILTER --> UPLOAD

    AUTH --> REPO
    TENANT --> REPO
    USER --> REPO
    ROLE --> REPO
    PRODUCT --> REPO
    INVENTORY --> REPO
    ORDER --> REPO
    PORTAL_MOD --> REPO
    SYSTEM --> REPO

    REPO --> MYSQL
    REPO --> CACHE
    REPO --> MIGRATION

    ALIYUN --> OSS
    ALIYUN --> SMS
    UPLOAD --> OSS

    style WEB fill:#e1f5ff
    style MOBILE fill:#e1f5ff
    style PORTAL fill:#e1f5ff
    style MYSQL fill:#f5f5f5
    style CACHE fill:#f5f5f5
    style OSS fill:#fff4e1
    style SMS fill:#fff4e1
```

## 多租户架构

```mermaid
graph LR
    subgraph "多租户隔离架构 Multi-Tenant Isolation"
        REQUEST[HTTP 请求]
        DOMAIN[域名解析]

        subgraph "租户识别 Tenant Identification"
            HEADER[Header: X-Tenant-ID]
            SUBDOMAIN[子域名]
            TOKEN[JWT Token]
        end

        TENANT_CTX[Tenant Context 装饰器]
        TENANT_FILTER[Tenant Query Filter]

        subgraph "数据隔离 Data Isolation"
            T1[租户1 数据]
            T2[租户2 数据]
            TP[平台数据]
        end
    end

    REQUEST --> DOMAIN
    DOMAIN --> HEADER
    DOMAIN --> SUBDOMAIN
    DOMAIN --> TOKEN

    HEADER --> TENANT_CTX
    SUBDOMAIN --> TENANT_CTX
    TOKEN --> TENANT_CTX

    TENANT_CTX --> TENANT_FILTER

    TENANT_FILTER --> T1
    TENANT_FILTER --> T2
    TENANT_FILTER --> TP
```

## 模块依赖关系

```mermaid
graph TD
    subgraph "核心模块 Core Modules"
        BASE[BaseEntity 基础实体]
        TENANT_BASE[TenantBaseEntity 租户基类]
        CONFIG[ConfigModule 配置模块]
        DB[DatabaseModule 数据库模块]
    end

    subgraph "认证授权 Auth & Authorization"
        AUTH[AuthModule]
        USERS[UsersModule]
        ROLES[RolesModule]
        JWT[JwtStrategy]
        PASSPORT[Passport]
    end

    subgraph "业务模块 Business Modules"
        TENANT[TenantModule]
        PRODUCT[ProductModule]
        INVENTORY[InventoryModule]
        ORDER[OrderModule]
        PORTAL[PortalModule]
        SYSTEM[SystemModule]
    end

    subgraph "集成模块 Integration Modules"
        ALIYUN[AliyunModule]
        OSS[OSSModule]
        SMS[SMSModule]
        UPLOAD[UploadModule]
    end

    BASE --> TENANT_BASE
    CONFIG --> DB
    DB --> TENANT_BASE

    AUTH --> USERS
    USERS --> ROLES
    AUTH --> PASSPORT
    AUTH --> JWT

    USERS --> TENANT_BASE
    ROLES --> TENANT_BASE
    TENANT --> TENANT_BASE
    PRODUCT --> TENANT_BASE
    INVENTORY --> TENANT_BASE
    ORDER --> TENANT_BASE
    PORTAL --> TENANT_BASE
    SYSTEM --> TENANT_BASE

    PRODUCT --> INVENTORY
    PRODUCT --> ORDER
    TENANT --> USERS
    TENANT --> PRODUCT
    PORTAL --> PRODUCT

    ALIYUN --> OSS
    ALIYUN --> SMS
    UPLOAD --> OSS
```

## 数据流架构

```mermaid
sequenceDiagram
    participant Client as 客户端
    participant Nginx as Nginx
    participant Guard as JWT 守卫
    participant Controller as Controller
    participant Service as Service
    participant Repository as Repository
    participant MySQL as MySQL
    participant Redis as Redis
    participant External as 外部服务

    Client->>Nginx: HTTP 请求
    Nginx->>Guard: 转发请求
    Guard->>Guard: 验证 JWT Token
    Guard->>Guard: 提取租户ID
    Guard->>Controller: 认证通过
    Controller->>Service: 调用业务逻辑
    Service->>Repository: 查询数据
    Repository->>MySQL: SQL 查询
    MySQL-->>Repository: 返回结果
    Repository->>Redis: 缓存数据
    Service->>External: 调用外部服务
    External-->>Service: 返回结果
    Service-->>Controller: 返回数据
    Controller-->>Client: JSON 响应
```

## 技术栈架构

```mermaid
graph TB
    subgraph "前端技术 Frontend"
        VUE[Vue.js]
        REACT[React]
        ANGULAR[Angular]
    end

    subgraph "后端框架 Backend Framework"
        NESTJS[NestJS]
        TYPESCRIPT[TypeScript]
        NODEJS[Node.js]
    end

    subgraph "数据层 Data Layer"
        TYPEORM[TypeORM]
        MYSQL[MySQL]
        MYSQL2[mysql2]
        REDIS[Redis]
    end

    subgraph "认证安全 Security"
        JWT[JWT]
        PASSPORT[Passport.js]
        BCRYPT[bcrypt]
        CLASS_VAL[class-validator]
    end

    subgraph "云服务 Cloud Services"
        ALI_OSS[阿里云 OSS]
        ALI_SMS[阿里云短信]
    end

    subgraph "开发工具 Development Tools"
        SWAGGER[Swagger]
        MULTER[Multer]
        DOTENV[dotenv]
    end

    NESTJS --> TYPESCRIPT
    TYPESCRIPT --> NODEJS

    NESTJS --> TYPEORM
    TYPEORM --> MYSQL
    TYPEORM --> REDIS

    NESTJS --> PASSPORT
    PASSPORT --> JWT
    NESTJS --> BCRYPT

    NESTJS --> ALI_OSS
    NESTJS --> ALI_SMS

    NESTJS --> SWAGGER
    NESTJS --> MULTER

    VUE --> NESTJS
    REACT --> NESTJS
    ANGULAR --> NESTJS
```

## 部署架构

```mermaid
graph TB
    subgraph "负载均衡层 Load Balancer"
        LB[负载均衡器]
    end

    subgraph "应用服务层 Application Servers"
        APP1[应用实例 1]
        APP2[应用实例 2]
        APP3[应用实例 N]
    end

    subgraph "数据层 Data Layer"
        MASTER[MySQL 主库]
        SLAVE1[MySQL 从库 1]
        SLAVE2[MySQL 从库 2]
        REDIS[Redis 集群]
    end

    subgraph "存储服务 Storage Services"
        OSS[阿里云 OSS]
    end

    LB --> APP1
    LB --> APP2
    LB --> APP3

    APP1 --> MASTER
    APP2 --> MASTER
    APP3 --> MASTER

    APP1 --> SLAVE1
    APP2 --> SLAVE1
    APP3 --> SLAVE2

    APP1 --> REDIS
    APP2 --> REDIS
    APP3 --> REDIS

    APP1 --> OSS
    APP2 --> OSS
    APP3 --> OSS

    MASTER -.->|主从复制| SLAVE1
    MASTER -.->|主从复制| SLAVE2
```

## 安全架构

```mermaid
graph TB
    subgraph "安全层 Security Layers"
        subgraph "传输安全 Transport Security"
            HTTPS[HTTPS/TLS]
            SSL[SSL 证书]
        end

        subgraph "认证层 Authentication Layer"
            JWT[JWT Token]
            REFRESH[Refresh Token]
            LOGIN[登录认证]
        end

        subgraph "授权层 Authorization Layer"
            RBAC[基于角色的访问控制]
            PERMISSION[权限验证]
            GUARD[路由守卫]
        end

        subgraph "数据安全 Data Security"
            ENCRYPT[密码加密 bcrypt]
            TENANT_ISOLATION[租户数据隔离]
            SQL_INJECTION[SQL 注入防护]
        end

        subgraph "审计安全 Audit Security"
            LOG[操作日志]
            ACCESS_LOG[访问日志]
        end
    end

    HTTPS --> SSL
    HTTPS --> LOGIN

    LOGIN --> JWT
    JWT --> REFRESH

    JWT --> RBAC
    RBAC --> PERMISSION
    PERMISSION --> GUARD

    GUARD --> TENANT_ISOLATION
    TENANT_ISOLATION --> SQL_INJECTION
    ENCRYPT --> SQL_INJECTION

    GUARD --> LOG
    PERMISSION --> ACCESS_LOG
```

---

## 架构说明

### 核心特性

1. **多租户架构 (Multi-Tenant Architecture)**
   - 基于 tenantId 的数据隔离
   - 支持平台管理员和租户用户两种角色
   - 租户通过域名、Header 或 JWT Token 识别

2. **模块化设计 (Modular Design)**
   - NestJS 模块化架构
   - 每个业务模块独立封装
   - 依赖注入实现松耦合

3. **分层架构 (Layered Architecture)**
   - 控制器层 (Controller)：处理 HTTP 请求
   - 服务层 (Service)：业务逻辑处理
   - 数据访问层 (Repository)：数据库操作

4. **安全机制 (Security)**
   - JWT 身份认证
   - RBAC 权限控制
   - bcrypt 密码加密
   - 租户数据隔离

5. **外部服务集成 (External Services)**
   - 阿里云 OSS 文件存储
   - 阿里云短信服务
