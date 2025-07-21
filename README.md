# 安全作业申请管理系统

基于 Next.js 的现代化安全作业申请管理系统，支持在线和离线模式，提供表单提交、历史记录查询和系统管理功能。

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [数据库设计](#数据库设计)
- [Docker部署](#docker部署)
- [常见问题](#常见问题)

## 功能特性

- **用户认证**: 手机号登录验证，自动用户创建
- **安全作业申请**: 完整的申请表单，实时验证，支持随行人员和危险作业类型选择
- **记录管理**: 历史记录查询、搜索筛选、批量操作
- **移动端支持**: 响应式设计，二维码生成
- **离线支持**: 离线填写提交，网络恢复后自动同步
- **系统管理**: 公司、项目、人员信息管理，数据导入导出
- **监控日志**: 健康检查API，错误追踪，性能监控

## 技术栈

- **前端**: Next.js 14, TypeScript, Tailwind CSS, Radix UI
- **后端**: Next.js API Routes, PostgreSQL, Winston 日志
- **开发**: ESLint, PostCSS, Docker

**系统要求**: Node.js 18+, PostgreSQL 12+

## 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/UrbanRailDivisionTeam/SafeAccessPortal.git
cd SafeAccessPortal

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 配置数据库连接等参数

# 4. 初始化数据库
psql -U postgres -c "CREATE DATABASE safe_access_db;"
psql -U postgres -d safe_access_db -f scripts/init-db.sql

# 5. 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。



## 数据库设计

### 核心表结构

- **users**: 用户基本信息（手机号、姓名等）
- **companies**: 作业公司信息
- **projects**: 作业项目信息
- **personnel**: 企业人员信息
- **safe_forms**: 安全作业申请主表
- **accompanying_persons**: 随行人员信息
- **safeformhead**: 数据同步表（表单头）
- **accompaningpersons**: 数据同步表（随行人员）

### 特殊功能

- 自动生成申请编号（格式：SA + YYYYMMDD + 序号）
- 数据同步功能，支持与其他软件系统集成
- 自动时间戳更新和数据清理



## Docker部署

### 快速部署

```bash
# 克隆项目
git clone <repository-url>
cd SafeAccessPortal

# 启动服务
docker-compose up -d

# 访问应用
open http://localhost:3000
```

### 基本管理命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 常见问题

### 数据库连接失败
- 检查数据库服务状态：`docker-compose ps`
- 查看数据库日志：`docker-compose logs postgres`
- 验证连接参数配置

### 端口冲突
- 修改 docker-compose.yml 中的端口映射
- 或停止占用端口的其他服务

### 应用无法启动
- 检查环境变量配置
- 查看应用日志：`docker-compose logs app`
- 确保数据库已正确初始化

---

## 技术支持

如有问题请联系城轨事业部技术团队或在项目仓库提交Issue。