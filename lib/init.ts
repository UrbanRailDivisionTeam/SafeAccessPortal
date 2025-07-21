/**
 * 系统初始化模块
 * 负责在应用启动时初始化日志记录、监控和错误处理系统
 */

import { log, appLogger } from './logger';
import { initializeMonitoring, metricsCollector, healthCheckManager, alertManager, AlertLevel } from './monitoring';
import fs from 'fs';
import path from 'path';

/**
 * 应用初始化配置
 */
interface InitConfig {
  logDir?: string;
  enableMonitoring?: boolean;
  enableHealthCheck?: boolean;
  enableAlerts?: boolean;
  metricsInterval?: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<InitConfig> = {
  logDir: process.env.LOG_DIR || './logs',
  enableMonitoring: process.env.HEALTH_CHECK_ENABLED !== 'false',
  enableHealthCheck: process.env.HEALTH_CHECK_ENABLED !== 'false',
  enableAlerts: process.env.ALERT_WEBHOOK_URL ? true : false,
  metricsInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL || '60000')
};

/**
 * 初始化日志系统
 */
function initializeLogging(config: Required<InitConfig>): void {
  try {
    // 确保日志目录存在
    if (!fs.existsSync(config.logDir)) {
      fs.mkdirSync(config.logDir, { recursive: true });
      console.log(`✅ 日志目录已创建: ${config.logDir}`);
    }
    
    // 检查日志目录权限
    fs.accessSync(config.logDir, fs.constants.W_OK);
    
    log.info('日志系统初始化完成', {
      module: 'INIT',
      logDir: config.logDir,
      logLevel: process.env.LOG_LEVEL || 'info',
      version: process.env.APP_VERSION || '1.0.0'
    });
    
    console.log('✅ 日志系统初始化成功');
    
  } catch (error) {
    console.error('❌ 日志系统初始化失败:', error);
    throw error;
  }
}

/**
 * 初始化监控系统
 */
function initializeMonitoringSystem(config: Required<InitConfig>): void {
  try {
    if (!config.enableMonitoring) {
      console.log('⚠️  监控系统已禁用');
      return;
    }
    
    // 初始化监控组件
    initializeMonitoring();
    
    // 启动指标收集
    if (config.metricsInterval > 0) {
      setInterval(() => {
        try {
          // 收集系统指标
          const memUsage = process.memoryUsage();
          const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
          
          metricsCollector.recordMetric('memory_usage_percent', memoryPercent);
          metricsCollector.recordMetric('memory_heap_used', memUsage.heapUsed);
          metricsCollector.recordMetric('memory_heap_total', memUsage.heapTotal);
          metricsCollector.recordMetric('uptime_seconds', process.uptime());
          
          // 检查内存使用率告警
          const memoryThreshold = parseFloat(process.env.MEMORY_USAGE_THRESHOLD || '80');
          if (memoryPercent > memoryThreshold) {
            alertManager.sendAlert({
              level: memoryPercent > 90 ? AlertLevel.CRITICAL : AlertLevel.WARNING,
              title: '内存使用率过高',
              message: `当前内存使用率: ${memoryPercent.toFixed(2)}%`,
              source: 'SYSTEM_MONITOR',
              metadata: {
                memoryPercent,
                memoryUsed: memUsage.heapUsed,
                memoryTotal: memUsage.heapTotal,
                threshold: memoryThreshold
              }
            });
          }
          
        } catch (error) {
          log.error('指标收集失败', {
            module: 'MONITORING',
            error: error instanceof Error ? error.message : 'Unknown error'
          }, error as Error);
        }
      }, config.metricsInterval);
    }
    
    log.info('监控系统初始化完成', {
      module: 'INIT',
      enableMonitoring: config.enableMonitoring,
      enableHealthCheck: config.enableHealthCheck,
      enableAlerts: config.enableAlerts,
      metricsInterval: config.metricsInterval
    });
    
    console.log('✅ 监控系统初始化成功');
    
  } catch (error) {
    log.error('监控系统初始化失败', {
      module: 'INIT',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    console.error('❌ 监控系统初始化失败:', error);
    throw error;
  }
}

/**
 * 初始化健康检查
 */
function initializeHealthChecks(config: Required<InitConfig>): void {
  try {
    if (!config.enableHealthCheck) {
      console.log('⚠️  健康检查已禁用');
      return;
    }
    
    // 注册基本健康检查
    healthCheckManager.registerCheck('system', async () => {
      const startTime = Date.now();
      const memUsage = process.memoryUsage();
      const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      return {
        name: 'system',
        status: memoryPercent > 95 ? 'fail' : memoryPercent > 85 ? 'warn' : 'pass',
        duration: Date.now() - startTime,
        message: `内存使用率: ${memoryPercent.toFixed(2)}%`,
        details: {
          memoryUsage: memUsage,
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform
        }
      };
    });
    
    // 注册日志系统健康检查
    healthCheckManager.registerCheck('logging', async () => {
      const startTime = Date.now();
      try {
        // 检查日志目录是否可写
        const testFile = path.join(config.logDir, '.health-check');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        
        return {
          name: 'logging',
          status: 'pass',
          duration: Date.now() - startTime,
          message: '日志系统正常',
          details: {
            logDir: config.logDir,
            logLevel: process.env.LOG_LEVEL || 'info'
          }
        };
      } catch (error) {
        return {
          name: 'logging',
          status: 'fail',
          duration: Date.now() - startTime,
          message: '日志系统异常',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        };
      }
    });
    
    log.info('健康检查初始化完成', {
      module: 'INIT',
      checksRegistered: 2 // system and logging checks
    });
    
    console.log('✅ 健康检查初始化成功');
    
  } catch (error) {
    log.error('健康检查初始化失败', {
      module: 'INIT',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    console.error('❌ 健康检查初始化失败:', error);
    throw error;
  }
}

/**
 * 设置进程事件监听
 */
function setupProcessHandlers(): void {
  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    log.error('未捕获的异常', {
      module: 'PROCESS',
      error: error.message,
      stack: error.stack
    }, error);
    
    // 发送紧急告警
    alertManager.sendAlert({
      level: AlertLevel.CRITICAL,
      title: '应用发生未捕获异常',
      message: error.message,
      source: 'UNCAUGHT_EXCEPTION',
      metadata: {
        stack: error.stack,
        pid: process.pid
      }
    });
    
    console.error('❌ 未捕获的异常:', error);
    
    // 优雅关闭
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  // 处理未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    log.error('未处理的Promise拒绝', {
      module: 'PROCESS',
      error: error.message,
      reason: String(reason)
    }, error);
    
    alertManager.sendAlert({
      level: AlertLevel.WARNING,
      title: '未处理的Promise拒绝',
      message: error.message,
      source: 'UNHANDLED_REJECTION',
      metadata: {
        reason: String(reason),
        promise: String(promise)
      }
    });
    
    console.error('❌ 未处理的Promise拒绝:', reason);
  });
  
  // 处理进程退出
  process.on('SIGTERM', () => {
    log.info('收到SIGTERM信号，开始优雅关闭', {
      module: 'PROCESS',
      pid: process.pid
    });
    
    console.log('🔄 收到SIGTERM信号，开始优雅关闭...');
    
    // 停止接收新请求，完成现有请求后退出
    setTimeout(() => {
      log.info('应用已优雅关闭', {
        module: 'PROCESS',
        pid: process.pid
      });
      
      console.log('✅ 应用已优雅关闭');
      process.exit(0);
    }, 5000);
  });
  
  process.on('SIGINT', () => {
    log.info('收到SIGINT信号，立即退出', {
      module: 'PROCESS',
      pid: process.pid
    });
    
    console.log('🛑 收到SIGINT信号，立即退出...');
    process.exit(0);
  });
  
  console.log('✅ 进程事件监听器已设置');
}

/**
 * 主初始化函数
 */
export async function initializeApplication(userConfig: InitConfig = {}): Promise<void> {
  const startTime = Date.now();
  
  console.log('🚀 开始初始化安全作业申请系统...');
  
  try {
    // 合并配置
    const config = { ...DEFAULT_CONFIG, ...userConfig };
    
    // 显示配置信息
    console.log('📋 初始化配置:');
    console.log(`   - 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   - 版本: ${process.env.APP_VERSION || '1.0.0'}`);
    console.log(`   - 日志目录: ${config.logDir}`);
    console.log(`   - 日志级别: ${process.env.LOG_LEVEL || 'info'}`);
    console.log(`   - 监控: ${config.enableMonitoring ? '启用' : '禁用'}`);
    console.log(`   - 健康检查: ${config.enableHealthCheck ? '启用' : '禁用'}`);
    console.log(`   - 告警: ${config.enableAlerts ? '启用' : '禁用'}`);
    
    // 1. 初始化日志系统
    console.log('\n📝 初始化日志系统...');
    initializeLogging(config);
    
    // 2. 初始化监控系统
    console.log('\n📊 初始化监控系统...');
    initializeMonitoringSystem(config);
    
    // 3. 初始化健康检查
    console.log('\n🏥 初始化健康检查...');
    initializeHealthChecks(config);
    
    // 4. 设置进程事件处理
    console.log('\n⚙️  设置进程事件处理...');
    setupProcessHandlers();
    
    const duration = Date.now() - startTime;
    
    // 记录初始化完成
    log.info('应用初始化完成', {
      module: 'INIT',
      duration,
      config,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    });
    
    console.log(`\n✅ 系统初始化完成! 耗时: ${duration}ms`);
    console.log('🎉 安全作业申请系统已就绪\n');
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error(`\n❌ 系统初始化失败! 耗时: ${duration}ms`);
    console.error('错误详情:', error);
    
    // 尝试记录错误（如果日志系统已初始化）
    try {
      log.error('应用初始化失败', {
        module: 'INIT',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error as Error);
    } catch {
      // 忽略日志记录错误
    }
    
    throw error;
  }
}

/**
 * 快速初始化（使用默认配置）
 */
export async function quickInit(): Promise<void> {
  return initializeApplication();
}

/**
 * 检查系统状态
 */
export function getSystemStatus() {
  const memUsage = process.memoryUsage();
  const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    memory: {
      ...memUsage,
      percentage: Math.round(memoryPercent * 100) / 100
    },
    monitoring: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      metricsInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL || '60000')
    }
  };
}

// 导出默认配置
export { DEFAULT_CONFIG };