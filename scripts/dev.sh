#!/bin/bash

# 开发环境启动脚本
# Development Environment Setup Script

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Node.js 和 npm
check_node() {
    log_info "检查 Node.js 环境..."
    
    if ! command -v node &> /dev/null; then
        log_error "未找到 Node.js，请先安装 Node.js 18 或更高版本"
        exit 1
    fi
    
    local node_version=$(node -v | sed 's/v//')
    local major_version=$(echo $node_version | cut -d. -f1)
    
    if [ "$major_version" -lt 18 ]; then
        log_error "Node.js 版本过低 ($node_version)，需要 18 或更高版本"
        exit 1
    fi
    
    log_success "Node.js 版本: $node_version"
}

# 检查包管理器
check_package_manager() {
    log_info "检查包管理器..."
    
    if [ -f "yarn.lock" ]; then
        PACKAGE_MANAGER="yarn"
        if ! command -v yarn &> /dev/null; then
            log_error "项目使用 Yarn，但未安装 Yarn"
            exit 1
        fi
    elif [ -f "pnpm-lock.yaml" ]; then
        PACKAGE_MANAGER="pnpm"
        if ! command -v pnpm &> /dev/null; then
            log_error "项目使用 pnpm，但未安装 pnpm"
            exit 1
        fi
    else
        PACKAGE_MANAGER="npm"
    fi
    
    log_success "使用包管理器: $PACKAGE_MANAGER"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    case $PACKAGE_MANAGER in
        "yarn")
            yarn install
            ;;
        "pnpm")
            pnpm install
            ;;
        "npm")
            npm install
            ;;
    esac
    
    log_success "依赖安装完成"
}

# 设置环境变量
setup_environment() {
    log_info "设置环境变量..."
    
    if [ ! -f ".env.local" ]; then
        if [ -f ".env.example" ]; then
            log_info "创建 .env.local 文件..."
            cp .env.example .env.local
            log_warning "请编辑 .env.local 文件并设置正确的数据库连接信息"
        else
            log_warning "未找到 .env.example 文件，创建默认配置..."
            cat > .env.local << EOF
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safe_access_db
DB_USER=postgres
DB_PASSWORD=password

# JWT 密钥
JWT_SECRET=dev-jwt-secret-key

# 管理员密码
ADMIN_PASSWORD=admin123

# Next.js 配置
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 配置系统设置
WORK_TYPE_OPTIONS=quality_rework,product_work,maintenance,inspection,other
DANGER_TYPE_OPTIONS=high_altitude,confined_space,hot_work,electrical,chemical,radiation,lifting,excavation
WORK_BASIS_OPTIONS=ncr,design_change,nonconformity,maintenance_plan,inspection_plan
DEPARTMENT_OPTIONS=quality,production,maintenance,engineering,safety,administration
POSITION_OPTIONS=engineer,technician,supervisor,manager,operator,inspector
EOF
        fi
    fi
    
    log_success "环境变量设置完成"
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    # 读取环境变量
    if [ -f ".env.local" ]; then
        export $(grep -v '^#' .env.local | xargs)
    fi
    
    local db_host=${DB_HOST:-localhost}
    local db_port=${DB_PORT:-5432}
    local db_name=${DB_NAME:-safe_access_db}
    local db_user=${DB_USER:-postgres}
    
    # 检查 PostgreSQL 是否运行
    if command -v pg_isready &> /dev/null; then
        if pg_isready -h "$db_host" -p "$db_port" -U "$db_user" &> /dev/null; then
            log_success "数据库连接正常"
        else
            log_warning "无法连接到数据库 ($db_host:$db_port)"
            log_info "请确保 PostgreSQL 正在运行并且连接信息正确"
        fi
    else
        log_warning "未找到 pg_isready 命令，跳过数据库连接检查"
    fi
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."
    
    if [ -f "scripts/init-db.sql" ]; then
        # 读取环境变量
        if [ -f ".env.local" ]; then
            export $(grep -v '^#' .env.local | xargs)
        fi
        
        local db_host=${DB_HOST:-localhost}
        local db_port=${DB_PORT:-5432}
        local db_name=${DB_NAME:-safe_access_db}
        local db_user=${DB_USER:-postgres}
        
        if command -v psql &> /dev/null; then
            log_info "执行数据库初始化脚本..."
            if PGPASSWORD="$DB_PASSWORD" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -f scripts/init-db.sql &> /dev/null; then
                log_success "数据库初始化完成"
            else
                log_warning "数据库初始化失败，可能是数据库不存在或权限问题"
                log_info "请手动创建数据库或检查连接信息"
            fi
        else
            log_warning "未找到 psql 命令，请手动执行数据库初始化"
        fi
    else
        log_warning "未找到数据库初始化脚本"
    fi
}

# 启动开发服务器
start_dev_server() {
    log_info "启动开发服务器..."
    
    case $PACKAGE_MANAGER in
        "yarn")
            yarn dev
            ;;
        "pnpm")
            pnpm dev
            ;;
        "npm")
            npm run dev
            ;;
    esac
}

# 显示开发信息
show_dev_info() {
    log_success "=== 开发环境设置完成 ==="
    echo
    log_info "开发服务器信息:"
    echo "  - 应用地址: http://localhost:3000"
    echo "  - 健康检查: http://localhost:3000/health"
    echo "  - API 端点: http://localhost:3000/api"
    echo
    
    log_info "开发命令:"
    echo "  - 启动开发服务器: $PACKAGE_MANAGER dev"
    echo "  - 构建应用: $PACKAGE_MANAGER build"
    echo "  - 启动生产服务器: $PACKAGE_MANAGER start"
    echo "  - 代码检查: $PACKAGE_MANAGER lint"
    echo
    
    log_info "数据库管理:"
    echo "  - 初始化数据库: ./scripts/init-db.sql"
    echo "  - 连接数据库: psql -h localhost -U postgres -d safe_access_db"
    echo
    
    log_info "环境配置:"
    echo "  - 环境变量文件: .env.local"
    echo "  - 默认管理员密码: ${ADMIN_PASSWORD:-admin123}"
    echo
    
    log_warning "注意事项:"
    echo "  - 请确保 PostgreSQL 数据库正在运行"
    echo "  - 首次运行前请检查 .env.local 中的数据库连接信息"
    echo "  - 生产环境请修改默认密码和密钥"
}

# 主函数
main() {
    local action="${1:-setup}"
    
    log_info "安全作业申请系统 - 开发环境设置"
    
    case "$action" in
        "setup")
            check_node
            check_package_manager
            install_dependencies
            setup_environment
            check_database
            init_database
            show_dev_info
            ;;
        "start")
            check_node
            check_package_manager
            start_dev_server
            ;;
        "install")
            check_node
            check_package_manager
            install_dependencies
            ;;
        "db-init")
            init_database
            ;;
        "info")
            show_dev_info
            ;;
        *)
            log_error "未知操作: $action"
            echo
            echo "用法: $0 [操作]"
            echo
            echo "操作:"
            echo "  setup     完整的开发环境设置 (默认)"
            echo "  start     启动开发服务器"
            echo "  install   仅安装依赖"
            echo "  db-init   仅初始化数据库"
            echo "  info      显示开发信息"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"