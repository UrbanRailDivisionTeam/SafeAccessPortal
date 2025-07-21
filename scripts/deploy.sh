#!/bin/bash

# 安全作业申请系统部署脚本
# Safe Access Application System Deployment Script

set -e  # 遇到错误时退出

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

# 检查必要的命令
check_dependencies() {
    log_info "检查依赖项..."
    
    local deps=("docker" "docker-compose" "node" "npm")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少以下依赖项: ${missing_deps[*]}"
        log_error "请安装缺少的依赖项后重试"
        exit 1
    fi
    
    log_success "所有依赖项检查通过"
}

# 检查环境变量
check_environment() {
    log_info "检查环境配置..."
    
    if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
        log_warning "未找到环境配置文件"
        log_info "创建默认环境配置文件..."
        
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
            log_warning "请编辑 .env.local 文件并设置正确的环境变量"
        else
            log_error "未找到 .env.example 文件"
            exit 1
        fi
    fi
    
    # 运行配置验证脚本
    log_info "验证配置系统..."
    if [ -f "scripts/validate-config.js" ]; then
        node scripts/validate-config.js
        if [ $? -ne 0 ]; then
            log_error "配置验证失败"
            exit 1
        fi
    else
        log_warning "配置验证脚本不存在，跳过验证"
    fi
    
    log_success "环境配置检查完成"
}

# 构建应用
build_app() {
    log_info "构建应用..."
    
    # 安装依赖
    log_info "安装依赖项..."
    npm ci
    
    # 构建应用
    log_info "构建 Next.js 应用..."
    npm run build
    
    log_success "应用构建完成"
}

# Docker 部署
deploy_docker() {
    log_info "使用 Docker 部署应用..."
    
    # 停止现有容器
    log_info "停止现有容器..."
    docker-compose down --remove-orphans || true
    
    # 构建并启动容器
    log_info "构建并启动容器..."
    docker-compose up -d --build
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose ps
    
    # 健康检查
    log_info "执行健康检查..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log_success "应用健康检查通过"
            break
        fi
        
        log_info "健康检查失败，重试中... ($attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "应用健康检查失败"
        log_info "查看应用日志:"
        docker-compose logs app
        exit 1
    fi
    
    log_success "Docker 部署完成"
}

# 本地部署
deploy_local() {
    log_info "本地部署应用..."
    
    # 检查数据库连接
    log_info "检查数据库连接..."
    if ! npm run db:check > /dev/null 2>&1; then
        log_warning "数据库连接失败，请确保 PostgreSQL 正在运行"
    fi
    
    # 启动应用
    log_info "启动应用..."
    npm run start &
    local app_pid=$!
    
    # 等待应用启动
    sleep 10
    
    # 健康检查
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "应用启动成功，PID: $app_pid"
        log_info "应用访问地址: http://localhost:3000"
    else
        log_error "应用启动失败"
        kill $app_pid 2>/dev/null || true
        exit 1
    fi
}

# 数据库初始化
init_database() {
    log_info "初始化数据库..."
    
    if [ -f "scripts/init-db.sql" ]; then
        # 如果使用 Docker
        if docker-compose ps postgres | grep -q "Up"; then
            log_info "使用 Docker 容器初始化数据库..."
            docker-compose exec postgres psql -U safe_user -d safe_access_db -f /docker-entrypoint-initdb.d/init-db.sql
        else
            # 本地数据库
            log_info "初始化本地数据库..."
            if command -v psql &> /dev/null; then
                psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-safe_access_db}" -f scripts/init-db.sql
            else
                log_warning "未找到 psql 命令，请手动执行数据库初始化脚本"
            fi
        fi
        
        log_success "数据库初始化完成"
    else
        log_warning "未找到数据库初始化脚本"
    fi
}

# 显示部署信息
show_deployment_info() {
    log_success "=== 部署完成 ==="
    echo
    log_info "应用访问地址:"
    echo "  - 主应用: http://localhost:3000"
    echo "  - 健康检查: http://localhost:3000/health"
    echo "  - API 文档: http://localhost:3000/api"
    echo
    
    if docker-compose ps | grep -q "Up"; then
        log_info "Docker 服务状态:"
        docker-compose ps
        echo
        
        log_info "查看日志命令:"
        echo "  - 应用日志: docker-compose logs -f app"
        echo "  - 数据库日志: docker-compose logs -f postgres"
        echo "  - 所有日志: docker-compose logs -f"
        echo
        
        log_info "管理命令:"
        echo "  - 停止服务: docker-compose down"
        echo "  - 重启服务: docker-compose restart"
        echo "  - 查看状态: docker-compose ps"
    else
        log_info "本地服务管理:"
        echo "  - 查看进程: ps aux | grep node"
        echo "  - 停止服务: pkill -f 'node.*next'"
    fi
    
    echo
    log_info "默认管理员账号:"
    echo "  - 密码: ${ADMIN_PASSWORD:-admin123}"
    echo "  - 请在生产环境中修改默认密码"
}

# 清理函数
cleanup() {
    log_info "清理临时文件..."
    # 在这里添加清理逻辑
}

# 主函数
main() {
    local deployment_type="${1:-docker}"
    
    log_info "开始部署安全作业申请系统..."
    log_info "部署类型: $deployment_type"
    
    # 设置清理陷阱
    trap cleanup EXIT
    
    # 检查依赖
    check_dependencies
    
    # 检查环境
    check_environment
    
    case "$deployment_type" in
        "docker")
            deploy_docker
            init_database
            ;;
        "local")
            build_app
            deploy_local
            ;;
        "build-only")
            build_app
            log_success "仅构建完成"
            return 0
            ;;
        *)
            log_error "未知的部署类型: $deployment_type"
            log_info "支持的部署类型: docker, local, build-only"
            exit 1
            ;;
    esac
    
    # 显示部署信息
    show_deployment_info
    
    log_success "部署完成！"
}

# 显示帮助信息
show_help() {
    echo "安全作业申请系统部署脚本"
    echo
    echo "用法: $0 [部署类型]"
    echo
    echo "部署类型:"
    echo "  docker      使用 Docker Compose 部署 (默认)"
    echo "  local       本地部署"
    echo "  build-only  仅构建应用"
    echo
    echo "示例:"
    echo "  $0 docker     # Docker 部署"
    echo "  $0 local      # 本地部署"
    echo "  $0 build-only # 仅构建"
    echo
}

# 检查参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 执行主函数
main "$@"