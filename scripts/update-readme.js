#!/usr/bin/env node

/**
 * README 更新脚本
 * README Update Script
 * 
 * 自动更新 README.md 中的配置相关信息
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

// 生成配置文档
function generateConfigDocs() {
  const configDocs = `
## 配置系统

本项目使用灵活的配置系统，支持通过环境变量自定义各种选项。

### 环境变量配置

#### 基本配置

\`\`\`bash
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
\`\`\`

#### 配置选项

系统支持通过环境变量自定义以下选项（使用逗号分隔）：

\`\`\`bash
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
\`\`\`

### 配置管理命令

\`\`\`bash
# 验证配置
npm run config:validate

# 查看当前配置
npm run config:show

# 迁移旧配置到新系统
npm run config:migrate
\`\`\`

### 配置文件优先级

1. \`.env.local\` (本地开发，不应提交到版本控制)
2. \`.env\` (环境特定配置)
3. \`.env.example\` (示例配置，用于参考)

### 自定义配置选项

要添加新的配置选项：

1. 在 \`lib/config.ts\` 中定义新的配置项
2. 在 \`lib/option-converter.ts\` 中添加相应的转换器
3. 更新环境变量文件
4. 运行 \`npm run config:validate\` 验证配置

### Docker 环境配置

Docker 环境中的配置通过 \`docker-compose.yml\` 文件管理：

\`\`\`yaml
environment:
  - DB_HOST=postgres
  - DB_PORT=5432
  - WORK_TYPE_OPTIONS=quality_rework,product_work,maintenance
  # ... 其他配置选项
\`\`\`
`;
  
  return configDocs;
}

// 更新 README.md
function updateReadme() {
  const readmePath = 'README.md';
  
  if (!fs.existsSync(readmePath)) {
    log.error('README.md 文件不存在');
    return false;
  }
  
  log.info('读取 README.md 文件...');
  let content = fs.readFileSync(readmePath, 'utf8');
  
  // 查找配置系统部分
  const configSectionStart = content.indexOf('## 配置系统');
  const nextSectionStart = content.indexOf('\n## ', configSectionStart + 1);
  
  const newConfigDocs = generateConfigDocs();
  
  if (configSectionStart !== -1) {
    // 替换现有的配置系统部分
    log.info('更新现有的配置系统文档...');
    
    const beforeConfig = content.substring(0, configSectionStart);
    const afterConfig = nextSectionStart !== -1 ? content.substring(nextSectionStart) : '';
    
    content = beforeConfig + newConfigDocs + (afterConfig ? '\n' + afterConfig : '');
  } else {
    // 在安装部分后添加配置系统文档
    log.info('添加配置系统文档...');
    
    const installSectionEnd = content.indexOf('\n## ', content.indexOf('## 安装') + 1);
    
    if (installSectionEnd !== -1) {
      const beforeInstall = content.substring(0, installSectionEnd);
      const afterInstall = content.substring(installSectionEnd);
      
      content = beforeInstall + newConfigDocs + '\n' + afterInstall;
    } else {
      // 如果找不到安装部分，就添加到文件末尾
      content += newConfigDocs;
    }
  }
  
  // 写入更新后的内容
  fs.writeFileSync(readmePath, content);
  log.success('README.md 更新完成');
  
  return true;
}

// 验证文档完整性
function validateDocs() {
  log.info('验证文档完整性...');
  
  const readmePath = 'README.md';
  const content = fs.readFileSync(readmePath, 'utf8');
  
  const requiredSections = [
    '## 配置系统',
    '### 环境变量配置',
    '### 配置管理命令',
    '### 配置文件优先级'
  ];
  
  let allSectionsPresent = true;
  
  requiredSections.forEach(section => {
    if (content.indexOf(section) === -1) {
      log.warning(`缺少文档部分: ${section}`);
      allSectionsPresent = false;
    } else {
      log.success(`找到文档部分: ${section}`);
    }
  });
  
  return allSectionsPresent;
}

// 主函数
function main() {
  console.log('\n=== README 更新工具 ===\n');
  
  if (updateReadme()) {
    console.log();
    if (validateDocs()) {
      log.success('文档更新和验证完成');
    } else {
      log.warning('文档更新完成，但存在一些问题');
    }
  } else {
    log.error('文档更新失败');
    process.exit(1);
  }
}

// 运行更新
if (require.main === module) {
  main();
}

module.exports = {
  updateReadme,
  validateDocs,
  generateConfigDocs
};