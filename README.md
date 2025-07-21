# 安全作业申请管理系统

一个基于 Next.js 的现代化安全作业申请管理系统，支持在线和离线模式，提供完整的表单提交、历史记录查询和系统管理功能。

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [配置系统](#配置系统)
- [数据库设计](#数据库设计)
- [表单验证规则](#表单验证规则)
- [数据同步功能](#数据同步功能)
- [日志记录与监控](#日志记录与监控)
- [部署说明](#部署说明)
- [Docker部署](#docker部署)
- [常见问题](#常见问题)

## 功能特性

### 🔐 用户认证
- 手机号登录验证
- 自动用户创建
- 登录状态持久化
- 安全的注销功能

### 📝 安全作业申请
- 完整的安全作业申请表单
- 实时表单验证
- 自动保存草稿
- 支持随行人员信息
- 危险作业类型选择
- 产品类作业特殊字段
- 基于历史记录的快速创建

### 📊 申请记录管理
- 历史申请记录查询
- 搜索和筛选功能
- 基于历史记录创建新申请
- 单个/批量删除记录
- 填充上次记录功能

### 📱 移动端支持
- 响应式设计
- 二维码生成和分享
- 触摸友好的界面
- 移动设备优化

### 🌐 离线支持
- 离线表单填写和提交
- 本地数据存储
- 网络恢复后自动同步
- 离线状态指示器
- Service Worker 支持

### ⚙️ 系统管理
- 公司信息管理
- 项目信息管理
- 人员信息管理
- 数据导入/导出功能
- CSV 批量导入支持

### 🔧 配置管理
- 统一的选项配置文件
- 自动化标签转换
- 工作地点、作业类型、危险作业类型等选项管理
- 易于维护的配置结构

### 📈 日志记录与监控
- 完整的日志记录系统
- 实时监控指标
- 健康检查API
- 错误追踪和告警
- 性能监控

## 技术栈

### 前端
- **Next.js 14** - React 全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Framer Motion** - 动画库
- **Radix UI** - 无障碍组件库
- **Heroicons** - 图标库

### 后端
- **Next.js API Routes** - 服务端API
- **PostgreSQL** - 数据库
- **node-postgres (pg)** - 数据库连接
- **Winston** - 日志记录
- **UUID** - 唯一标识符生成

### 开发工具
- **ESLint** - 代码检查
- **PostCSS** - CSS 处理
- **Autoprefixer** - CSS 前缀

## 系统要求

- **Node.js** 18.0 或更高版本
- **PostgreSQL** 12 或更高版本
- **npm** 或 **yarn** 包管理器

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd SafeAccessPortal
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置数据库连接和其他必要参数：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safe_access_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT 密钥 (请使用强密码)
JWT_SECRET=your_jwt_secret_key_here

# 管理员密码
ADMIN_PASSWORD=your_admin_password_here

# Next.js 配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 数据库初始化

```bash
# 创建数据库并初始化表结构
psql -U postgres -c "CREATE DATABASE safe_access_db;"
psql -U postgres -d safe_access_db -f scripts/init-db.sql
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 配置系统

本项目使用灵活的配置系统，支持通过环境变量自定义各种选项。

### 环境变量配置

#### 基本配置

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safe_access_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT 密钥
JWT_SECRET=your_jwt_secret_key_here

# 管理员密码
ADMIN_PASSWORD=your_admin_password_here

# Next.js 配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 日志和监控配置

```bash
# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs
APP_VERSION=1.0.0

# 监控配置
HEALTH_CHECK_ENABLED=true
METRICS_COLLECTION_INTERVAL=60000

# 告警配置
ALERT_WEBHOOK_URL=https://your-webhook-url.com
ALERT_EMAIL_ENABLED=false

# 性能阈值
SLOW_REQUEST_THRESHOLD=5000
SLOW_QUERY_THRESHOLD=1000
MEMORY_USAGE_THRESHOLD=80
CPU_USAGE_THRESHOLD=80
DISK_USAGE_THRESHOLD=90
```

#### 配置选项

系统支持通过环境变量自定义以下选项（使用逗号分隔）：

```bash
# 工作类型选项
WORK_TYPE_OPTIONS=quality_rework,product_work,maintenance,inspection,other

# 危险作业类型选项
DANGER_TYPE_OPTIONS=high_altitude,confined_space,hot_work,electrical,chemical,radiation,lifting,excavation

# 作业依据选项
WORK_BASIS_OPTIONS=ncr,design_change,nonconformity,maintenance_plan,inspection_plan

# 部门选项
DEPARTMENT_OPTIONS=quality,production,maintenance,engineering,safety,administration

# 职位选项
POSITION_OPTIONS=engineer,technician,supervisor,manager,operator,inspector
```

### 配置管理命令

```bash
# 验证配置
npm run config:validate

# 查看当前配置
npm run config:show

# 迁移旧配置到新系统
npm run config:migrate

# 查看日志
npm run logs:view

# 查看错误日志
npm run logs:error

# 清理日志
npm run logs:clean

# 启动监控
npm run monitoring:start
```

## 数据库设计

### 核心表结构

#### 1. users（用户表）
存储系统用户基本信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL | 用户ID（主键） |
| phone | VARCHAR(20) | 手机号码（唯一） |
| name | VARCHAR(100) | 用户姓名 |
| created_at | TIMESTAMP | 创建时间 |
| last_login | TIMESTAMP | 最后登录时间 |

#### 2. companies（公司表）
存储作业公司信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL | 公司ID（主键） |
| name | VARCHAR(200) | 公司名称（唯一） |
| created_at | TIMESTAMP | 创建时间 |

#### 3. projects（项目表）
存储作业项目信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL | 项目ID（主键） |
| name | VARCHAR(200) | 项目名称（唯一） |
| created_at | TIMESTAMP | 创建时间 |

#### 4. personnel（人员表）
存储企业人员基本信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL | 人员ID（主键） |
| name | VARCHAR(100) | 姓名 |
| employee_number | VARCHAR(50) | 工号（唯一） |
| department | VARCHAR(100) | 部门 |
| position | VARCHAR(100) | 职位 |
| phone | VARCHAR(20) | 联系电话 |
| created_at | TIMESTAMP | 创建时间 |

#### 5. safe_forms（安全作业申请表）
存储安全作业申请的主要信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL | 申请ID（主键） |
| application_number | VARCHAR(50) | 申请编号（唯一，格式：SA20241217001） |
| user_id | INTEGER | 用户ID（外键） |
| applicant_name | VARCHAR(100) | 申请人姓名 |
| applicant_id | VARCHAR(20) | 申请人身份证号 |
| applicant_phone | VARCHAR(20) | 申请人电话 |
| work_company | VARCHAR(200) | 作业公司 |
| work_project | VARCHAR(200) | 作业项目 |
| work_location | VARCHAR(500) | 作业地点 |
| work_type | VARCHAR(50) | 作业类型 |
| work_content | TEXT | 作业内容 |
| work_start_time | TIMESTAMP | 作业开始时间 |
| work_end_time | TIMESTAMP | 作业结束时间 |
| is_product_work | BOOLEAN | 是否产品类作业 |
| work_basis | VARCHAR(50) | 作业依据 |
| basis_number | VARCHAR(100) | 依据编号 |
| danger_types | TEXT[] | 危险作业类型 |
| notifier_name | VARCHAR(100) | 通知人姓名 |
| notifier_phone | VARCHAR(20) | 通知人电话 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### 6. accompanying_persons（随行人员表）
存储安全作业申请的随行人员信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL | 随行人员ID（主键） |
| form_id | INTEGER | 申请表ID（外键） |
| name | VARCHAR(100) | 随行人员姓名 |
| id_number | VARCHAR(20) | 身份证号 |
| phone | VARCHAR(20) | 联系电话 |
| employee_number | VARCHAR(50) | 工号 |
| department | VARCHAR(100) | 部门 |
| created_at | TIMESTAMP | 创建时间 |

### 数据同步表

#### 7. safeformhead（安全表单头表-同步表）
用于与其他软件系统同步的安全表单主要信息表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL | 记录ID（主键） |
| applicationNumber | TEXT | 申请编号 |
| name | TEXT | 申请人姓名 |
| idNumber | TEXT | 身份证号 |
| companyName | TEXT | 公司名称 |
| phoneNumber | TEXT | 联系电话 |
| submitTime | TEXT | 提交时间 |
| workLocation | TEXT | 作业地点（中文） |
| workType | TEXT | 作业类型（中文） |
| workContent | TEXT | 作业内容 |
| dangerTypes | TEXT | 危险作业类型（中文，逗号分隔） |
| accompaningCount | INTEGER | 随行人员数量 |

#### 8. accompaningpersons（随行人员表-同步表）
用于与其他软件系统同步的随行人员信息表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL | 记录ID（主键） |
| formApplicationNumber | TEXT | 申请编号 |
| name | TEXT | 随行人员姓名 |
| idNumber | TEXT | 身份证号 |
| phoneNumber | TEXT | 联系电话 |

### 数据库关系说明

- **users** ← **safe_forms**：一个用户可以提交多个安全作业申请
- **safe_forms** → **accompanying_persons**：一个申请可以包含多个随行人员
- **safeformhead** ↔ **accompaningpersons**：通过applicationNumber字段关联

### 特殊功能

1. **自动生成申请编号**：格式为 SA + YYYYMMDD + 4位序号
2. **自动更新时间戳**：safe_forms 表的 updated_at 字段会在更新时自动更新
3. **数据清理功能**：提供 cleanup_old_data() 函数清理过期数据
4. **视图支持**：safe_forms_with_persons 视图提供带随行人员的完整申请信息

## 表单验证规则

### 基本信息验证

#### 申请人姓名
- **验证规则**: 不能为空或仅包含空格
- **错误提示**: "姓名不能为空"

#### 身份证号码
- **验证规则**: 必须符合18位身份证号码格式
- **正则表达式**: `/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/`
- **错误提示**: "身份证号格式不正确"

#### 联系电话
- **验证规则**: 必须符合中国大陆手机号码格式
- **正则表达式**: `/^1[3-9]\d{9}$/`
- **错误提示**: "手机号码格式不正确"

### 作业信息验证

#### 计划开工日期
- **验证规则**: 必须是未来日期（不能是今天或过去的日期）
- **错误提示**: "开工日期必须是未来日期"

#### 作业内容
- **验证规则**: 不能为空或仅包含空格
- **错误提示**: "作业内容不能为空"

### 产品类作业特殊验证（质量返工）

当作业类型为"质量返工"时，需要额外验证：

#### 依据编号格式验证
- **NCR**: 必须包含"ncr"(不区分大小写)
- **设计变更**: 必须包含"cm"(不区分大小写)
- **不合格项**: 长度大于0即可

### 对接人信息验证

#### 对接人工号
- **验证规则**: 必须是12位数字
- **正则表达式**: `/^\d{12}$/`
- **错误提示**: "对接人工号格式不正确（12位数字）"

### 随行人员信息验证

当随行人员数量大于0时，需要验证每个随行人员的：
- 姓名（不能为空）
- 身份证号（18位格式）
- 联系电话（手机号格式）

### 错误处理机制

#### 单个错误响应格式
```json
{
  "error": "具体错误信息",
  "details": { "字段名": "错误描述" },
  "message": "请检查并修正表单中的错误信息后重新提交"
}
```

#### 多个错误响应格式
```json
{
  "error": "发现 X 个问题需要修正",
  "details": { 
    "字段名1": "错误描述1",
    "字段名2": "错误描述2"
  },
  "message": "请检查并修正表单中的错误信息后重新提交"
}
```

## 数据同步功能

### 功能概述

系统新增了数据同步功能，当用户提交安全表单后，系统不仅会将数据写入原有的业务表，还会同时将数据同步到两个专门的同步表中，以便其他软件进行数据同步和抽取。

### 数据同步流程

1. **用户提交表单**：用户在前端填写并提交安全作业申请表单
2. **业务数据写入**：系统首先将数据写入原有的业务表
3. **同步数据写入**：在同一个数据库事务中，系统同时将数据写入同步表
4. **事务提交**：所有数据写入成功后，提交事务确保数据一致性

### 数据转换优化

系统实现了英文value到中文label的自动转换，确保同步到其他软件系统的数据更加友好和可读。

#### 主要转换映射

**工作地点映射**
- `assembly_workshop` → `总成车间`
- `old_debugging` → `老调试`
- `new_debugging` → `新调试`

**作业类型映射**
- `quality_rework` → `质量返工`
- `furniture_maintenance` → `家具维修及活动策划`
- `vehicle_maintenance` → `车辆检修作业`

**危险作业类型映射**
- `high_altitude` → `登高作业`
- `hot_work` → `动火作业`
- `vehicle_debugging` → `配合车辆静、动态调试作业`

#### 时间格式优化

```typescript
// 修改前：2025-06-25T06:41:04.141Z
// 修改后：2025/06/25 14:41:04
const submitTimeStr = currentTime.toLocaleString('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})
```

### 技术实现要点

#### 事务一致性
所有数据写入操作都在同一个数据库事务中进行，确保数据的一致性：

```javascript
try {
  await client.query('BEGIN')
  
  // 写入业务表
  // ...
  
  // 写入同步表
  // ...
  
  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
}
```

#### 数据抽取建议

其他软件可以通过以下方式抽取数据：

```sql
-- 获取所有表单头信息
SELECT * FROM public.safeformhead ORDER BY id;

-- 获取指定单据的随行人员
SELECT * FROM public.accompaningpersons 
WHERE "formApplicationNumber" = '申请单号';

-- 获取最新的表单（增量同步）
SELECT * FROM public.safeformhead 
WHERE id > last_sync_id ORDER BY id;
```

## 日志记录与监控

### 日志记录方案

#### 日志级别定义

| 级别 | 用途 | 示例场景 |
|------|------|----------|
| **ERROR** | 系统错误，需要立即关注 | 数据库连接失败、API调用异常、业务逻辑错误 |
| **WARN** | 警告信息，可能影响系统性能 | 数据库连接池不足、请求超时、配置项缺失 |
| **INFO** | 重要业务信息 | 用户登录、表单提交、数据同步完成 |
| **DEBUG** | 调试信息（仅开发环境） | 函数调用参数、中间变量值、执行流程 |

#### 日志格式规范

```
[时间戳] [级别] [模块] [用户ID] [请求ID] [消息] [详细信息]
```

示例：
```
[2024-12-17T10:30:15.123Z] [INFO] [AUTH] [user_12345] [req_abc123] 用户登录成功 {"ip":"192.168.1.100","userAgent":"Chrome/120.0"}
```

#### 日志分类

**业务日志**
- 用户操作日志：登录、提交申请、查看历史等
- 数据变更日志：表单创建、修改、删除
- 同步日志：数据同步到外部系统的记录

**系统日志**
- 性能日志：API响应时间、数据库查询时间
- 错误日志：异常堆栈、错误详情
- 安全日志：登录失败、权限验证失败

**审计日志**
- 管理员操作：系统配置变更、用户权限修改
- 数据访问：敏感数据的查看和导出
- 系统维护：数据库备份、系统更新

### 监控指标

#### 业务指标
- **表单提交成功率**: 目标 > 99%
- **用户登录成功率**: 目标 > 98%
- **数据同步成功率**: 目标 > 99.5%

#### 技术指标
- **API响应时间**: P95 < 500ms
- **数据库查询时间**: P95 < 200ms
- **错误率**: < 1%

#### 系统指标
- **CPU使用率**: < 80%
- **内存使用率**: < 85%
- **磁盘使用率**: < 90%

### 健康检查API

访问健康检查端点：

```bash
# 完整健康检查
curl http://localhost:3000/api/health

# 简单存活检查
curl -I http://localhost:3000/api/health
```

健康检查响应示例：

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "responseTime": "15ms",
    "version": "PostgreSQL 14.0"
  },
  "memory": {
    "used": 128.5,
    "total": 512.0,
    "percentage": 25.1,
    "status": "normal"
  }
}
```

### 监控指标API

```bash
# 获取所有指标
curl http://localhost:3000/api/metrics

# 重置指标统计
curl -X DELETE http://localhost:3000/api/metrics
```

### 告警机制

#### 告警级别
- **P0 - 紧急**: 系统完全不可用
- **P1 - 严重**: 核心功能异常
- **P2 - 重要**: 部分功能异常
- **P3 - 一般**: 性能问题或警告

#### 告警方式
- **即时通知**: 钉钉、企业微信、短信
- **邮件报告**: 每日/每周错误汇总
- **监控面板**: Grafana、Kibana仪表板

### 使用示例

```typescript
import { log } from '@/lib/logger';
import { withFullMiddleware } from '@/middleware/integration-example';

// 记录日志
log.info('用户登录成功', {
  module: 'AUTH',
  userId: '12345',
  ip: '192.168.1.1'
});

// 使用中间件
export const GET = withFullMiddleware(async (request) => {
  // 你的API逻辑
  return NextResponse.json({ success: true });
});
```

## 部署说明

### 开发环境部署

1. **安装依赖**
```bash
npm install
```

2. **配置环境变量**
```bash
cp .env.example .env.local
# 编辑 .env.local 文件，配置数据库连接等参数
```

3. **初始化数据库**
```bash
psql -U postgres -c "CREATE DATABASE safe_access_db;"
psql -U postgres -d safe_access_db -f scripts/init-db.sql
```

4. **启动开发服务器**
```bash
npm run dev
```

### 生产环境部署

1. **构建应用**
```bash
npm run build
```

2. **启动生产服务器**
```bash
npm start
```

3. **使用PM2管理进程**
```bash
npm install -g pm2
pm2 start npm --name "safe-access-portal" -- start
```

## Docker部署

### 快速部署

1. **克隆项目**
```bash
git clone <repository-url>
cd SafeAccessPortal
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **访问应用**
- 主应用: http://localhost:3000
- 健康检查: http://localhost:3000/api/health
- 管理后台: http://localhost:3000/admin

### Docker Compose 配置

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: safe-access-app
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=safe_access_db
      - DB_USER=safe_user
      - DB_PASSWORD=safe_password
    depends_on:
      - postgres
      - redis
    networks:
      - safe-access-network

  postgres:
    image: postgres:15-alpine
    container_name: safe-access-db
    environment:
      POSTGRES_DB: safe_access_db
      POSTGRES_USER: safe_user
      POSTGRES_PASSWORD: safe_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"
    networks:
      - safe-access-network

  redis:
    image: redis:7-alpine
    container_name: safe-access-redis
    ports:
      - "6379:6379"
    networks:
      - safe-access-network

volumes:
  postgres_data:

networks:
  safe-access-network:
    driver: bridge
```

### 服务管理命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
docker-compose logs -f postgres

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 重新构建并启动
docker-compose up -d --build
```

### 镜像部署到其他环境

1. **导出镜像**
```bash
docker save -o safe-access-portal.tar safe-access-portal
```

2. **加载镜像**
```bash
docker load -i safe-access-portal.tar
```

3. **运行容器**
```bash
docker run -p 3000:3000 safe-access-portal
```

### 数据库配置

#### 重新配置步骤

1. **停止并清理现有容器和数据卷**
```bash
docker-compose down -v
```

2. **启动 PostgreSQL 数据库服务**
```bash
docker-compose up -d postgres
```

3. **验证数据库启动状态**
```bash
docker logs safe-access-db
```

4. **验证数据库表结构**
```bash
docker exec safe-access-db psql -U safe_user -d safe_access_db -c "\dt"
```

#### 数据库管理命令

```bash
# 连接数据库
docker exec -it safe-access-db psql -U safe_user -d safe_access_db

# 备份数据库
docker exec safe-access-db pg_dump -U safe_user safe_access_db > backup.sql

# 恢复数据库
docker exec -i safe-access-db psql -U safe_user -d safe_access_db < backup.sql
```

## 常见问题

### 1. 数据库连接失败

**问题**: 应用无法连接到数据库

**解决方案**:
- 检查数据库服务是否正在运行
- 验证数据库连接参数是否正确
- 检查防火墙设置
- 查看数据库日志

```bash
# 检查数据库状态
docker ps | grep postgres

# 查看数据库日志
docker logs safe-access-db

# 测试数据库连接
psql -h localhost -U safe_user -d safe_access_db -c "SELECT 1;"
```

### 2. 端口冲突

**问题**: 端口3000或5432已被占用

**解决方案**:
- 修改docker-compose.yml中的端口映射
- 或停止占用端口的其他服务

```bash
# 查看端口占用
netstat -an | findstr 3000
netstat -an | findstr 5432

# 修改端口映射
# 在docker-compose.yml中将"3000:3000"改为"3001:3000"
```

### 3. 日志文件未生成

**问题**: 日志文件没有在指定目录生成

**解决方案**:
- 检查LOG_DIR环境变量是否正确设置
- 确保应用有写入日志目录的权限
- 检查磁盘空间是否充足

```bash
# 检查日志目录权限
ls -la ./logs

# 创建日志目录
mkdir -p ./logs
chmod 755 ./logs
```

### 4. 监控指标不更新

**问题**: 监控指标API返回空数据或过期数据

**解决方案**:
- 检查METRICS_COLLECTION_INTERVAL配置
- 确保监控中间件已正确集成
- 检查应用是否有足够的内存

### 5. 表单提交失败

**问题**: 表单提交时出现验证错误或系统错误

**解决方案**:
- 检查表单数据格式是否正确
- 查看应用错误日志
- 验证数据库连接状态
- 检查必填字段是否完整

### 6. Docker构建失败

**问题**: Docker镜像构建过程中出现错误

**解决方案**:
- 检查Dockerfile语法
- 确保所有依赖文件存在
- 清理Docker缓存后重新构建

```bash
# 清理Docker缓存
docker system prune -a

# 重新构建镜像
docker-compose build --no-cache
```

### 故障排除工具

#### 查看实时日志
```bash
# 查看应用日志
tail -f ./logs/application-$(date +%Y-%m-%d).log

# 查看错误日志
tail -f ./logs/error-$(date +%Y-%m-%d).log

# 过滤特定模块的日志
grep "AUTH" ./logs/application-$(date +%Y-%m-%d).log
```

#### 监控系统资源
```bash
# 监控内存使用
watch -n 1 'ps aux | grep node'

# 监控磁盘使用
df -h

# 监控日志文件大小
ls -lh ./logs/
```

#### 健康检查
```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 检查数据库连接
curl http://localhost:3000/api/health | jq '.database'

# 检查系统指标
curl http://localhost:3000/api/metrics
```

---

## 技术支持

如果您在使用过程中遇到问题，请：

1. 查看本文档的常见问题部分
2. 检查应用日志文件
3. 访问健康检查API确认系统状态
4. 联系开发团队获取支持

---

**文档版本**: 2.0  
**最后更新**: 2024年12月17日  
**维护人员**: 系统开发团队

**项目地址**: [GitHub Repository](https://github.com/your-org/safe-access-portal)  
**在线文档**: [Documentation Site](https://docs.safe-access-portal.com)  
**问题反馈**: [Issues](https://github.com/your-org/safe-access-portal/issues)