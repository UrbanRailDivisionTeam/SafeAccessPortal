#!/usr/bin/env node

/**
 * 配置验证脚本
 * Configuration Validation Script
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

// 必需的环境变量
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'ADMIN_PASSWORD'
];

// 配置选项环境变量
const configEnvVars = [
  'WORK_TYPE_OPTIONS',
  'DANGER_TYPE_OPTIONS',
  'WORK_BASIS_OPTIONS',
  'DEPARTMENT_OPTIONS',
  'POSITION_OPTIONS'
];

// 检查环境变量文件
function checkEnvFiles() {
  log.info('检查环境变量文件...');
  
  const envFiles = ['.env.example', '.env.local', '.env'];
  const existingFiles = [];
  
  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      existingFiles.push(file);
      log.success(`找到环境文件: ${file}`);
    }
  });
  
  if (existingFiles.length === 0) {
    log.error('未找到任何环境变量文件');
    return false;
  }
  
  return true;
}

// 检查必需的环境变量
function checkRequiredEnvVars() {
  log.info('检查必需的环境变量...');
  
  const missing = [];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  if (missing.length > 0) {
    log.warning(`缺少以下环境变量: ${missing.join(', ')}`);
    log.warning('这些变量在生产环境中是必需的');
    return false;
  }
  
  log.success('所有必需的环境变量都已设置');
  return true;
}

// 检查配置选项
function checkConfigOptions() {
  log.info('检查配置选项...');
  
  let allValid = true;
  
  configEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const options = value.split(',').map(opt => opt.trim());
      log.success(`${varName}: ${options.length} 个选项`);
      options.forEach(opt => {
        if (opt) {
          console.log(`  - ${opt}`);
        }
      });
    } else {
      log.warning(`未设置配置选项: ${varName}`);
      allValid = false;
    }
  });
  
  return allValid;
}

// 验证配置系统
function validateConfigSystem() {
  log.info('验证配置系统...');
  
  try {
    // 尝试加载配置模块
    const configPath = path.join(process.cwd(), 'lib', 'config.ts');
    if (!fs.existsSync(configPath)) {
      log.error('配置文件不存在: lib/config.ts');
      return false;
    }
    
    log.success('配置系统文件存在');
    
    // 检查 OptionConverter
    const optionConverterPath = path.join(process.cwd(), 'lib', 'option-converter.ts');
    if (!fs.existsSync(optionConverterPath)) {
      log.error('选项转换器文件不存在: lib/option-converter.ts');
      return false;
    }
    
    log.success('选项转换器文件存在');
    return true;
  } catch (error) {
    log.error(`配置系统验证失败: ${error.message}`);
    return false;
  }
}

// 主函数
function main() {
  console.log('\n=== 安全作业申请系统配置验证 ===\n');
  
  let allChecksPass = true;
  
  // 检查环境文件
  if (!checkEnvFiles()) {
    allChecksPass = false;
  }
  
  console.log();
  
  // 检查必需环境变量
  if (!checkRequiredEnvVars()) {
    allChecksPass = false;
  }
  
  console.log();
  
  // 检查配置选项
  if (!checkConfigOptions()) {
    allChecksPass = false;
  }
  
  console.log();
  
  // 验证配置系统
  if (!validateConfigSystem()) {
    allChecksPass = false;
  }
  
  console.log();
  
  if (allChecksPass) {
    log.success('所有配置检查通过！');
    process.exit(0);
  } else {
    log.error('配置验证失败，请检查上述问题');
    process.exit(1);
  }
}

// 运行验证
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvFiles,
  checkRequiredEnvVars,
  checkConfigOptions,
  validateConfigSystem
};