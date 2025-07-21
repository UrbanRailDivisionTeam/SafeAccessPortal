#!/usr/bin/env node
/**
 * 日志查看工具
 * 用于查看和分析各类日志文件
 */

const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// 获取日志文件列表
function getLogFiles() {
  if (!fs.existsSync(logsDir)) {
    colorLog('red', '❌ 日志目录不存在: ' + logsDir);
    return [];
  }
  
  return fs.readdirSync(logsDir)
    .filter(file => file.endsWith('.log'))
    .map(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime
      };
    })
    .sort((a, b) => b.modified - a.modified);
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 分析日志类型分布
function analyzeLogTypes(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const stats = {
      total: lines.length,
      business: 0,
      security: 0,
      performance: 0,
      audit: 0,
      error: 0,
      warn: 0,
      info: 0,
      other: 0
    };
    
    lines.forEach(line => {
      try {
        const log = JSON.parse(line);
        
        // 统计日志级别
        if (log.level) {
          stats[log.level] = (stats[log.level] || 0) + 1;
        }
        
        // 统计日志类型
        if (log.logType) {
          stats[log.logType] = (stats[log.logType] || 0) + 1;
        } else {
          stats.other++;
        }
      } catch (e) {
        // 忽略解析错误的行
      }
    });
    
    return stats;
  } catch (error) {
    colorLog('red', `❌ 读取文件失败: ${error.message}`);
    return null;
  }
}

// 显示最近的日志
function showRecentLogs(filePath, count = 10, logType = null) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n')
      .filter(line => line.trim())
      .slice(-count * 2) // 取更多行以防过滤后不够
      .reverse();
    
    let displayed = 0;
    
    for (const line of lines) {
      if (displayed >= count) break;
      
      try {
        const log = JSON.parse(line);
        
        // 如果指定了日志类型，则过滤
        if (logType && log.logType !== logType) {
          continue;
        }
        
        // 格式化输出
        const timestamp = log.timestamp || 'N/A';
        const level = log.level || 'info';
        const message = log.message || 'N/A';
        const logTypeStr = log.logType ? `[${log.logType.toUpperCase()}]` : '';
        
        // 根据级别选择颜色
        let color = 'reset';
        switch (level) {
          case 'error': color = 'red'; break;
          case 'warn': color = 'yellow'; break;
          case 'info': color = 'green'; break;
          default: color = 'cyan';
        }
        
        colorLog(color, `${timestamp} [${level.toUpperCase()}] ${logTypeStr} ${message}`);
        
        // 显示额外信息
        if (log.userId) console.log(`  👤 用户: ${log.userId}`);
        if (log.action) console.log(`  🎯 操作: ${log.action}`);
        if (log.module) console.log(`  📦 模块: ${log.module}`);
        if (log.error) {
          colorLog('red', `  ❌ 错误: ${log.error.message}`);
        }
        
        console.log(''); // 空行分隔
        displayed++;
      } catch (e) {
        // 忽略解析错误的行
      }
    }
    
    if (displayed === 0) {
      colorLog('yellow', '⚠️ 没有找到匹配的日志记录');
    }
  } catch (error) {
    colorLog('red', `❌ 读取文件失败: ${error.message}`);
  }
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';
  
  colorLog('cyan', '📋 安全作业申请系统 - 日志查看工具');
  colorLog('cyan', '=' .repeat(50));
  
  switch (command) {
    case 'list':
    case 'ls':
      const files = getLogFiles();
      if (files.length === 0) {
        colorLog('yellow', '⚠️ 没有找到日志文件');
        return;
      }
      
      colorLog('bright', '\n📁 日志文件列表:');
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
        console.log(`   📏 大小: ${formatSize(file.size)}`);
        console.log(`   🕒 修改时间: ${file.modified.toLocaleString()}`);
        console.log('');
      });
      break;
      
    case 'stats':
    case 'analyze':
      const statsFile = args[1] || 'combined.log';
      const statsPath = path.join(logsDir, statsFile);
      
      if (!fs.existsSync(statsPath)) {
        colorLog('red', `❌ 文件不存在: ${statsFile}`);
        return;
      }
      
      colorLog('bright', `\n📊 日志统计分析: ${statsFile}`);
      const stats = analyzeLogTypes(statsPath);
      
      if (stats) {
        console.log(`\n📈 总记录数: ${stats.total}`);
        console.log('\n📋 日志类型分布:');
        console.log(`  🏢 业务日志: ${stats.business || 0}`);
        console.log(`  🔒 安全日志: ${stats.security || 0}`);
        console.log(`  ⚡ 性能日志: ${stats.performance || 0}`);
        console.log(`  📋 审计日志: ${stats.audit || 0}`);
        console.log(`  ❓ 其他日志: ${stats.other || 0}`);
        
        console.log('\n📊 日志级别分布:');
        console.log(`  ❌ 错误: ${stats.error || 0}`);
        console.log(`  ⚠️ 警告: ${stats.warn || 0}`);
        console.log(`  ℹ️ 信息: ${stats.info || 0}`);
      }
      break;
      
    case 'tail':
    case 'recent':
      const tailFile = args[1] || 'combined.log';
      const tailCount = parseInt(args[2]) || 10;
      const tailPath = path.join(logsDir, tailFile);
      
      if (!fs.existsSync(tailPath)) {
        colorLog('red', `❌ 文件不存在: ${tailFile}`);
        return;
      }
      
      colorLog('bright', `\n📜 最近 ${tailCount} 条日志记录: ${tailFile}`);
      showRecentLogs(tailPath, tailCount);
      break;
      
    case 'business':
    case 'security':
    case 'performance':
    case 'audit':
      const typeFile = args[1] || 'combined.log';
      const typeCount = parseInt(args[2]) || 10;
      const typePath = path.join(logsDir, typeFile);
      
      if (!fs.existsSync(typePath)) {
        colorLog('red', `❌ 文件不存在: ${typeFile}`);
        return;
      }
      
      colorLog('bright', `\n📋 最近 ${typeCount} 条 ${command.toUpperCase()} 日志: ${typeFile}`);
      showRecentLogs(typePath, typeCount, command);
      break;
      
    case 'help':
    case '-h':
    case '--help':
      console.log('\n📖 使用说明:');
      console.log('  node scripts/view-logs.js [命令] [参数]');
      console.log('\n🔧 可用命令:');
      console.log('  list, ls                    - 列出所有日志文件');
      console.log('  stats [文件名]              - 显示日志统计信息');
      console.log('  tail [文件名] [行数]        - 显示最近的日志记录');
      console.log('  business [文件名] [行数]    - 显示业务日志');
      console.log('  security [文件名] [行数]    - 显示安全日志');
      console.log('  performance [文件名] [行数] - 显示性能日志');
      console.log('  audit [文件名] [行数]       - 显示审计日志');
      console.log('  help                        - 显示帮助信息');
      console.log('\n💡 示例:');
      console.log('  node scripts/view-logs.js list');
      console.log('  node scripts/view-logs.js stats combined.log');
      console.log('  node scripts/view-logs.js tail combined.log 20');
      console.log('  node scripts/view-logs.js business combined.log 5');
      break;
      
    default:
      colorLog('red', `❌ 未知命令: ${command}`);
      colorLog('yellow', '💡 使用 "help" 查看可用命令');
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  getLogFiles,
  analyzeLogTypes,
  showRecentLogs
};