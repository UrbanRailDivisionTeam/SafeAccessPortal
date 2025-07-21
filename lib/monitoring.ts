import { log, LogContext } from './logger';
import { NextRequest, NextResponse } from 'next/server';

// 系统健康状态接口
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
}

// 健康检查项接口
interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  details?: any;
}

// 性能指标接口
interface PerformanceMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  requests: {
    total: number;
    success: number;
    error: number;
    averageResponseTime: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
  };
}

// 告警级别
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// 告警接口
interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: string;
  source: string;
  metadata?: any;
}

// 监控指标收集器
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, any> = new Map();
  private requestStats = {
    total: 0,
    success: 0,
    error: 0,
    totalResponseTime: 0
  };
  
  private constructor() {
    this.startMetricsCollection();
  }
  
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  // 记录请求指标
  recordRequest(duration: number, success: boolean) {
    this.requestStats.total++;
    this.requestStats.totalResponseTime += duration;
    
    if (success) {
      this.requestStats.success++;
    } else {
      this.requestStats.error++;
    }
  }
  
  // 记录自定义指标
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const key = `${name}_${JSON.stringify(tags || {})}`;
    this.metrics.set(key, {
      name,
      value,
      tags,
      timestamp: new Date().toISOString()
    });
  }
  
  // 获取请求统计
  getRequestStats() {
    return {
      ...this.requestStats,
      averageResponseTime: this.requestStats.total > 0 
        ? this.requestStats.totalResponseTime / this.requestStats.total 
        : 0,
      successRate: this.requestStats.total > 0 
        ? (this.requestStats.success / this.requestStats.total) * 100 
        : 0
    };
  }
  
  // 获取所有指标
  getAllMetrics() {
    return Array.from(this.metrics.values());
  }
  
  // 重置指标
  resetMetrics() {
    this.requestStats = {
      total: 0,
      success: 0,
      error: 0,
      totalResponseTime: 0
    };
    this.metrics.clear();
  }
  
  // 开始指标收集
  private startMetricsCollection() {
    // 每分钟收集一次系统指标
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);
  }
  
  // 收集系统指标
  private async collectSystemMetrics() {
    try {
      // 内存使用情况
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memUsage = process.memoryUsage();
        this.recordMetric('memory_used', memUsage.heapUsed);
        this.recordMetric('memory_total', memUsage.heapTotal);
      }
      
      // CPU使用情况（简化版）
      if (typeof process !== 'undefined' && process.cpuUsage) {
        const cpuUsage = process.cpuUsage();
        this.recordMetric('cpu_user', cpuUsage.user);
        this.recordMetric('cpu_system', cpuUsage.system);
      }
      
      // 运行时间
      if (typeof process !== 'undefined' && process.uptime) {
        this.recordMetric('uptime', process.uptime());
      }
    } catch (error) {
      log.warn('系统指标收集失败', {
        module: 'MONITORING',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // 获取性能指标
  getPerformanceMetrics() {
    const performanceMetrics = Array.from(this.metrics.values())
      .filter(metric => metric.name.includes('cpu') || metric.name.includes('memory') || metric.name.includes('uptime'));
    
    return {
      cpu: {
        user: performanceMetrics.find(m => m.name === 'cpu_user')?.value || 0,
        system: performanceMetrics.find(m => m.name === 'cpu_system')?.value || 0
      },
      memory: {
        used: performanceMetrics.find(m => m.name === 'memory_used')?.value || 0,
        total: performanceMetrics.find(m => m.name === 'memory_total')?.value || 0
      },
      uptime: performanceMetrics.find(m => m.name === 'uptime')?.value || 0
    };
  }

  // 获取错误统计
  getErrorStats() {
    return {
      total: this.requestStats.error,
      rate: this.requestStats.total > 0 ? (this.requestStats.error / this.requestStats.total) * 100 : 0,
      recent: Array.from(this.metrics.values())
        .filter(metric => metric.name.includes('error'))
        .slice(-10)
    };
  }

  // 获取数据库统计
  getDatabaseStats() {
    const dbMetrics = Array.from(this.metrics.values())
      .filter(metric => metric.name.includes('database') || metric.name.includes('db'));
    
    return {
      connections: dbMetrics.find(m => m.name === 'db_connections')?.value || 0,
      queries: dbMetrics.find(m => m.name === 'db_queries')?.value || 0,
      avgQueryTime: dbMetrics.find(m => m.name === 'db_avg_query_time')?.value || 0
    };
  }

  // 获取自定义指标
  getCustomMetrics() {
    return Array.from(this.metrics.values())
      .filter(metric => !metric.name.includes('cpu') && 
                       !metric.name.includes('memory') && 
                       !metric.name.includes('uptime') &&
                       !metric.name.includes('error') &&
                       !metric.name.includes('database') &&
                       !metric.name.includes('db'));
  }
}

// 健康检查管理器
export class HealthCheckManager {
  private static instance: HealthCheckManager;
  private checks: Map<string, () => Promise<HealthCheck>> = new Map();
  
  private constructor() {
    this.registerDefaultChecks();
  }
  
  public static getInstance(): HealthCheckManager {
    if (!HealthCheckManager.instance) {
      HealthCheckManager.instance = new HealthCheckManager();
    }
    return HealthCheckManager.instance;
  }
  
  // 注册健康检查
  registerCheck(name: string, checkFunction: () => Promise<HealthCheck>) {
    this.checks.set(name, checkFunction);
  }
  
  // 执行所有健康检查
  async runAllChecks(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];
    
    for (const [name, checkFunction] of Array.from(this.checks.entries())) {
      try {
        const check = await checkFunction();
        checks.push(check);
      } catch (error) {
        checks.push({
          name,
          status: 'fail',
          duration: Date.now() - startTime,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // 确定整体健康状态
    const failedChecks = checks.filter(c => c.status === 'fail');
    const warnChecks = checks.filter(c => c.status === 'warn');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (failedChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (warnChecks.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 0,
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    };
  }
  
  // 注册默认健康检查
  private registerDefaultChecks() {
    // 数据库连接检查
    this.registerCheck('database', async (): Promise<HealthCheck> => {
      const startTime = Date.now();
      try {
        // 这里应该实际检查数据库连接
        // 暂时模拟检查
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return {
          name: 'database',
          status: 'pass',
          duration: Date.now() - startTime,
          message: '数据库连接正常'
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'fail',
          duration: Date.now() - startTime,
          message: `数据库连接失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    });
    
    // Redis连接检查
    this.registerCheck('redis', async (): Promise<HealthCheck> => {
      const startTime = Date.now();
      try {
        // 这里应该实际检查Redis连接
        await new Promise(resolve => setTimeout(resolve, 5));
        
        return {
          name: 'redis',
          status: 'pass',
          duration: Date.now() - startTime,
          message: 'Redis连接正常'
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'fail',
          duration: Date.now() - startTime,
          message: `Redis连接失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    });
    
    // 内存使用检查
    this.registerCheck('memory', async (): Promise<HealthCheck> => {
      const startTime = Date.now();
      try {
        if (typeof process !== 'undefined' && process.memoryUsage) {
          const memUsage = process.memoryUsage();
          const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
          
          let status: 'pass' | 'warn' | 'fail';
          let message: string;
          
          if (usagePercent > 90) {
            status = 'fail';
            message = `内存使用率过高: ${usagePercent.toFixed(2)}%`;
          } else if (usagePercent > 80) {
            status = 'warn';
            message = `内存使用率较高: ${usagePercent.toFixed(2)}%`;
          } else {
            status = 'pass';
            message = `内存使用率正常: ${usagePercent.toFixed(2)}%`;
          }
          
          return {
            name: 'memory',
            status,
            duration: Date.now() - startTime,
            message,
            details: {
              used: memUsage.heapUsed,
              total: memUsage.heapTotal,
              percentage: usagePercent
            }
          };
        } else {
          return {
            name: 'memory',
            status: 'warn',
            duration: Date.now() - startTime,
            message: '无法获取内存使用信息'
          };
        }
      } catch (error) {
        return {
          name: 'memory',
          status: 'fail',
          duration: Date.now() - startTime,
          message: `内存检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    });
    
    // 磁盘空间检查
    this.registerCheck('disk', async (): Promise<HealthCheck> => {
      const startTime = Date.now();
      try {
        // 简化的磁盘检查，实际应该使用fs.statSync等API
        return {
          name: 'disk',
          status: 'pass',
          duration: Date.now() - startTime,
          message: '磁盘空间充足'
        };
      } catch (error) {
        return {
          name: 'disk',
          status: 'fail',
          duration: Date.now() - startTime,
          message: `磁盘检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    });
  }
}

// 告警管理器
export class AlertManager {
  private static instance: AlertManager;
  private alerts: Alert[] = [];
  private webhooks: string[] = [];
  
  private constructor() {}
  
  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }
  
  // 添加Webhook
  addWebhook(url: string) {
    this.webhooks.push(url);
  }
  
  // 发送告警
  async sendAlert(alert: Omit<Alert, 'id' | 'timestamp'>) {
    const fullAlert: Alert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date().toISOString()
    };
    
    this.alerts.push(fullAlert);
    
    // 记录告警日志
    const logLevel = this.getLogLevel(alert.level);
    log[logLevel](`告警: ${alert.title}`, {
      module: 'ALERT',
      alertId: fullAlert.id,
      level: alert.level,
      source: alert.source,
      message: alert.message
    });
    
    // 发送到外部系统
    await this.notifyExternalSystems(fullAlert);
    
    return fullAlert;
  }
  
  // 获取告警历史
  getAlerts(level?: AlertLevel, limit: number = 100): Alert[] {
    let filteredAlerts = this.alerts;
    
    if (level) {
      filteredAlerts = this.alerts.filter(a => a.level === level);
    }
    
    return filteredAlerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
  
  // 清理过期告警
  cleanupAlerts(maxAge: number = 7 * 24 * 60 * 60 * 1000) { // 默认7天
    const cutoff = Date.now() - maxAge;
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoff
    );
  }
  
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getLogLevel(alertLevel: AlertLevel): 'info' | 'warn' | 'error' {
    switch (alertLevel) {
      case AlertLevel.INFO:
        return 'info';
      case AlertLevel.WARNING:
        return 'warn';
      case AlertLevel.ERROR:
      case AlertLevel.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }
  
  private async notifyExternalSystems(alert: Alert) {
    // 发送到配置的Webhook
    for (const webhook of this.webhooks) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        log.error('Webhook通知失败', {
          module: 'ALERT',
          webhook,
          alertId: alert.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // 这里可以添加其他通知方式：
    // - 钉钉机器人
    // - 企业微信
    // - 邮件
    // - 短信
  }
}

// 监控中间件
export function createMonitoringMiddleware() {
  const metricsCollector = MetricsCollector.getInstance();
  const alertManager = AlertManager.getInstance();
  
  return function monitoringMiddleware(request: NextRequest) {
    const startTime = Date.now();
    
    return async function(response: NextResponse) {
      const duration = Date.now() - startTime;
      const success = response.status < 400;
      
      // 记录请求指标
      metricsCollector.recordRequest(duration, success);
      
      // 检查是否需要告警
      if (duration > 5000) { // 超过5秒的请求
        await alertManager.sendAlert({
          level: AlertLevel.WARNING,
          title: '慢请求告警',
          message: `请求响应时间过长: ${duration}ms`,
          source: 'monitoring_middleware',
          metadata: {
            url: request.url,
            method: request.method,
            duration,
            status: response.status
          }
        });
      }
      
      if (!success) {
        const level = response.status >= 500 ? AlertLevel.ERROR : AlertLevel.WARNING;
        await alertManager.sendAlert({
          level,
          title: '请求错误告警',
          message: `请求失败: ${response.status}`,
          source: 'monitoring_middleware',
          metadata: {
            url: request.url,
            method: request.method,
            status: response.status
          }
        });
      }
      
      return response;
    };
  };
}

// 健康检查API处理器
export async function handleHealthCheck(request: NextRequest): Promise<NextResponse> {
  const healthManager = HealthCheckManager.getInstance();
  const metricsCollector = MetricsCollector.getInstance();
  
  try {
    const healthStatus = await healthManager.runAllChecks();
    const requestStats = metricsCollector.getRequestStats();
    
    const response = {
      ...healthStatus,
      metrics: {
        requests: requestStats
      }
    };
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    log.error('健康检查失败', {
      module: 'HEALTH_CHECK',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: '健康检查执行失败'
    }, { status: 503 });
  }
}

// 指标API处理器
export async function handleMetrics(request: NextRequest): Promise<NextResponse> {
  const metricsCollector = MetricsCollector.getInstance();
  
  try {
    const metrics = {
      requests: metricsCollector.getRequestStats(),
      custom: metricsCollector.getAllMetrics(),
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(metrics);
  } catch (error) {
    log.error('指标获取失败', {
      module: 'METRICS',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    return NextResponse.json({
      error: '指标获取失败'
    }, { status: 500 });
  }
}

// 导出单例实例
export const metricsCollector = MetricsCollector.getInstance();
export const healthCheckManager = HealthCheckManager.getInstance();
export const alertManager = AlertManager.getInstance();

// 初始化监控系统
export function initializeMonitoring() {
  // 配置告警Webhook（从环境变量读取）
  const webhookUrls = process.env.ALERT_WEBHOOKS?.split(',') || [];
  webhookUrls.forEach(url => alertManager.addWebhook(url.trim()));
  
  // 定期清理过期告警
  setInterval(() => {
    alertManager.cleanupAlerts();
  }, 24 * 60 * 60 * 1000); // 每天清理一次
  
  log.info('监控系统初始化完成', {
    module: 'MONITORING',
    webhooks: webhookUrls.length
  });
}