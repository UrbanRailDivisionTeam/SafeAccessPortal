#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// 日志文件路径
const LOG_DIR = path.join(__dirname, 'logs');
const COMBINED_LOG = path.join(LOG_DIR, 'combined.log');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');

// 帮助信息
function showHelp() {
  console.log(`
日志查看工具使用说明：
`);
  console.log('查看统计信息:');
  console.log('  node view-logs.js stats');
  console.log('');
  console.log('查看特定类型日志:');
  console.log('  node view-logs.js business    # 查看业务日志');
  console.log('  node view-logs.js security    # 查看安全日志');
  console.log('  node view-logs.js performance # 查看性能日志');
  console.log('  node view-logs.js audit       # 查看审计日志');
  console.log('  node view-logs.js error       # 查看错误日志');
  console.log('');
  console.log('查看最近N条日志:');
  console.log('  node view-logs.js tail combined.log 10  # 查看最近10条综合日志');
  console.log('  node view-logs.js tail error.log 5     # 查看最近5条错误日志');
  console.log('');
}

// 读取日志文件
function readLogFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').filter(line => line.trim());
  } catch (error) {
    console.error(`读取日志文件失败: ${error.message}`);
    return [];
  }
}

// 解析日志行
function parseLogLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

// 统计日志信息
function showStats() {
  console.log('\n=== 日志统计信息 ===\n');
  
  const combinedLogs = readLogFile(COMBINED_LOG);
  const errorLogs = readLogFile(ERROR_LOG);
  
  console.log(`总日志记录数: ${combinedLogs.length}`);
  console.log(`错误日志记录数: ${errorLogs.length}`);
  
  // 统计日志类型
  const typeStats = {};
  const levelStats = {};
  
  combinedLogs.forEach(line => {
    const log = parseLogLine(line);
    if (log && log.context) {
      const module = log.context.module || 'OTHER';
      typeStats[module] = (typeStats[module] || 0) + 1;
      
      const level = log.level || 'unknown';
      levelStats[level] = (levelStats[level] || 0) + 1;
    }
  });
  
  console.log('\n--- 按模块分布 ---');
  Object.entries(typeStats).forEach(([type, count]) => {
    console.log(`${type}: ${count}`);
  });
  
  console.log('\n--- 按级别分布 ---');
  Object.entries(levelStats).forEach(([level, count]) => {
    console.log(`${level}: ${count}`);
  });
  
  console.log('');
}

// 显示特定类型的日志
function showLogsByType(type) {
  const logs = readLogFile(COMBINED_LOG);
  const filteredLogs = [];
  
  logs.forEach(line => {
    const log = parseLogLine(line);
    if (log && log.context && log.context.module) {
      const module = log.context.module.toLowerCase();
      if (module.includes(type.toLowerCase())) {
        filteredLogs.push(log);
      }
    }
  });
  
  console.log(`\n=== ${type.toUpperCase()} 日志 (最近${Math.min(filteredLogs.length, 10)}条) ===\n`);
  
  filteredLogs.slice(-10).forEach(log => {
    console.log(`[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`);
    if (log.context) {
      console.log(`  模块: ${log.context.module || 'N/A'}`);
      console.log(`  动作: ${log.context.action || 'N/A'}`);
      if (log.context.userId) console.log(`  用户: ${log.context.userId}`);
      if (log.context.ip) console.log(`  IP: ${log.context.ip}`);
    }
    console.log('');
  });
  
  if (filteredLogs.length === 0) {
    console.log('未找到相关日志记录。\n');
  }
}

// 显示最近N条日志
function showTailLogs(filename, count = 10) {
  const filePath = path.join(LOG_DIR, filename);
  const logs = readLogFile(filePath);
  
  console.log(`\n=== ${filename} 最近${count}条日志 ===\n`);
  
  const recentLogs = logs.slice(-count);
  recentLogs.forEach(line => {
    const log = parseLogLine(line);
    if (log) {
      console.log(`[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`);
      if (log.context) {
        const ctx = log.context;
        console.log(`  模块: ${ctx.module || 'N/A'} | 动作: ${ctx.action || 'N/A'}`);
        if (ctx.userId) console.log(`  用户: ${ctx.userId}`);
        if (ctx.requestId) console.log(`  请求ID: ${ctx.requestId}`);
      }
    } else {
      console.log(line);
    }
    console.log('');
  });
  
  if (logs.length === 0) {
    console.log('日志文件为空或不存在。\n');
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showHelp();
    return;
  }
  
  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'stats':
      showStats();
      break;
    case 'business':
    case 'security':
    case 'performance':
    case 'audit':
    case 'error':
      showLogsByType(command);
      break;
    case 'tail':
      if (args.length < 2) {
        console.log('错误: tail命令需要指定文件名');
        console.log('用法: node view-logs.js tail <filename> [count]');
        return;
      }
      const filename = args[1];
      const count = args[2] ? parseInt(args[2]) : 10;
      showTailLogs(filename, count);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.log(`未知命令: ${command}`);
      showHelp();
  }
}

if (require.main === module) {
  main();
}

module.exports = { showStats, showLogsByType, showTailLogs };