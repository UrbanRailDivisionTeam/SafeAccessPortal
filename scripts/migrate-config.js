#!/usr/bin/env node

/**
 * 配置迁移脚本
 * Configuration Migration Script
 * 
 * 帮助用户从硬编码配置迁移到新的配置系统
 */

const fs = require('fs');
const path = require('path');

// 颜色定义
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// 日志函数
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`)
};

// 默认配置选项
const defaultOptions = {
  WORK_TYPE_OPTIONS: 'quality_rework,product_work,maintenance,inspection,other',
  DANGER_TYPE_OPTIONS: 'high_altitude,confined_space,hot_work,electrical,chemical,radiation,lifting,excavation',
  WORK_BASIS_OPTIONS: 'ncr,design_change,nonconformity,maintenance_plan,inspection_plan',
  DEPARTMENT_OPTIONS: 'quality,production,maintenance,engineering,safety,administration',
  POSITION_OPTIONS: 'engineer,technician,supervisor,manager,operator,inspector'
};

// 读取环境文件
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

// 写入环境文件
function writeEnvFile(filePath, env) {
  const lines = [];
  
  // 添加注释
  lines.push('# 安全作业申请系统环境配置');
  lines.push('# Safe Access Application System Environment Configuration');
  lines.push('');
  
  // 基本配置
  lines.push('# 数据库配置');
  lines.push(`DB_HOST=${env.DB_HOST || 'localhost'}`);
  lines.push(`DB_PORT=${env.DB_PORT || '5432'}`);
  lines.push(`DB_NAME=${env.DB_NAME || 'safe_access_db'}`);
  lines.push(`DB_USER=${env.DB_USER || 'your_db_user'}`);
  lines.push(`DB_PASSWORD=${env.DB_PASSWORD || 'your_db_password'}`);
  lines.push('');
  
  lines.push('# JWT 密钥 (请使用强密码)');
  lines.push(`JWT_SECRET=${env.JWT_SECRET || 'your_jwt_secret_key_here'}`);
  lines.push('');
  
  lines.push('# 管理员密码');
  lines.push(`ADMIN_PASSWORD=${env.ADMIN_PASSWORD || 'your_admin_password_here'}`);
  lines.push('');
  
  lines.push('# Next.js 配置');
  lines.push(`NEXT_PUBLIC_APP_URL=${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
  lines.push('');
  
  lines.push('# 可选：启用调试模式');
  lines.push('# DEBUG=true');
  lines.push('');
  
  // 配置系统设置
  lines.push('# 配置系统设置');
  lines.push('# 工作类型选项（逗号分隔）');
  lines.push(`WORK_TYPE_OPTIONS=${env.WORK_TYPE_OPTIONS || defaultOptions.WORK_TYPE_OPTIONS}`);
  lines.push('');
  
  lines.push('# 危险作业类型选项（逗号分隔）');
  lines.push(`DANGER_TYPE_OPTIONS=${env.DANGER_TYPE_OPTIONS || defaultOptions.DANGER_TYPE_OPTIONS}`);
  lines.push('');
  
  lines.push('# 作业依据选项（逗号分隔）');
  lines.push(`WORK_BASIS_OPTIONS=${env.WORK_BASIS_OPTIONS || defaultOptions.WORK_BASIS_OPTIONS}`);
  lines.push('');
  
  lines.push('# 部门选项（逗号分隔）');
  lines.push(`DEPARTMENT_OPTIONS=${env.DEPARTMENT_OPTIONS || defaultOptions.DEPARTMENT_OPTIONS}`);
  lines.push('');
  
  lines.push('# 职位选项（逗号分隔）');
  lines.push(`POSITION_OPTIONS=${env.POSITION_OPTIONS || defaultOptions.POSITION_OPTIONS}`);
  
  fs.writeFileSync(filePath, lines.join('\n'));
}

// 备份文件
function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    log.info(`已备份原文件到: ${backupPath}`);
    return backupPath;
  }
  return null;
}

// 迁移环境文件
function migrateEnvFile(filePath) {
  log.info(`迁移环境文件: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    log.warning(`文件不存在: ${filePath}`);
    return false;
  }
  
  // 备份原文件
  const backupPath = backupFile(filePath);
  
  // 读取现有配置
  const existingEnv = readEnvFile(filePath);
  
  // 检查是否已经包含新配置
  const hasNewConfig = Object.keys(defaultOptions).some(key => existingEnv[key]);
  
  if (hasNewConfig) {
    log.info('文件已包含新配置选项，跳过迁移');
    return true;
  }
  
  // 添加新配置选项
  Object.keys(defaultOptions).forEach(key => {
    if (!existingEnv[key]) {
      existingEnv[key] = defaultOptions[key];
      log.success(`添加配置选项: ${key}`);
    }
  });
  
  // 写入更新后的配置
  writeEnvFile(filePath, existingEnv);
  
  log.success(`环境文件迁移完成: ${filePath}`);
  return true;
}

// 检查项目文件
function checkProjectFiles() {
  log.info('检查项目文件...');
  
  const requiredFiles = [
    'lib/config.ts',
    'lib/option-converter.ts'
  ];
  
  let allExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log.success(`找到文件: ${file}`);
    } else {
      log.error(`缺少文件: ${file}`);
      allExist = false;
    }
  });
  
  return allExist;
}

// 主迁移函数
function migrate() {
  console.log('\n=== 配置系统迁移工具 ===\n');
  
  // 检查项目文件
  if (!checkProjectFiles()) {
    log.error('项目文件不完整，请确保配置系统文件存在');
    process.exit(1);
  }
  
  console.log();
  
  // 迁移环境文件
  const envFiles = ['.env.example', '.env.local', '.env'];
  let migratedCount = 0;
  
  envFiles.forEach(file => {
    if (migrateEnvFile(file)) {
      migratedCount++;
    }
  });
  
  console.log();
  
  if (migratedCount > 0) {
    log.success(`成功迁移 ${migratedCount} 个环境文件`);
    log.info('请检查更新后的环境文件并根据需要调整配置选项');
  } else {
    log.warning('没有文件需要迁移');
  }
  
  // 提供下一步指导
  console.log();
  log.info('下一步:');
  console.log('1. 检查并编辑环境文件中的配置选项');
  console.log('2. 运行 npm run config:validate 验证配置');
  console.log('3. 运行 npm run config:show 查看当前配置');
  console.log('4. 重启开发服务器以应用新配置');
}

// 运行迁移
if (require.main === module) {
  migrate();
}

module.exports = {
  migrate,
  migrateEnvFile,
  checkProjectFiles
};