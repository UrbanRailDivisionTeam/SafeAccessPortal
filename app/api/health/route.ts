import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { log } from '@/lib/logger';
import { metricsCollector, healthCheckManager } from '@/lib/monitoring';

// 数据库连接池
let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'safe_access_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || `health_${Date.now()}`;
  
  log.debug('健康检查请求开始', {
    module: 'HEALTH_API',
    requestId,
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  });
  
  try {
    
    // 检查数据库连接
    const dbPool = getPool();
    const client = await dbPool.connect();
    
    try {
      // 执行简单查询测试数据库连接
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      const dbTime = result.rows[0]?.current_time;
      const dbVersion = result.rows[0]?.db_version;
      
      // 检查主要表是否存在
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'safe_forms', 'companies', 'projects', 'personnel')
        ORDER BY table_name
      `);
      
      const tables = tablesResult.rows.map(row => row.table_name);
      const expectedTables = ['companies', 'personnel', 'projects', 'safe_forms', 'users'];
      const missingTables = expectedTables.filter(table => !tables.includes(table));
      
      const responseTime = Date.now() - startTime;
      
      // 获取请求统计信息
      const requestStats = metricsCollector.getRequestStats();
      
      // 计算内存使用率
      const memUsage = process.memoryUsage();
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      const healthData = {
        status: missingTables.length === 0 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
        requestId,
        database: {
          status: 'connected',
          responseTime: `${responseTime}ms`,
          serverTime: dbTime,
          version: dbVersion?.split(' ')[0] || 'unknown',
          tables: {
            found: tables,
            missing: missingTables,
            allPresent: missingTables.length === 0
          }
        },
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
          total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
          external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
          percentage: Math.round(memoryUsagePercent * 100) / 100,
          status: memoryUsagePercent > 90 ? 'critical' : memoryUsagePercent > 80 ? 'warning' : 'normal'
        },
        system: {
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid
        },
        metrics: {
          requests: requestStats,
          healthCheckDuration: responseTime
        }
      };
      
      const duration = Date.now() - startTime;
      
      log.info('健康检查完成', {
        module: 'HEALTH_API',
        requestId,
        duration,
        status: healthData.status,
        dbResponseTime: responseTime,
        memoryUsage: memoryUsagePercent
      });
      
      // 记录性能指标
      metricsCollector.recordMetric('health_check_duration', duration);
      metricsCollector.recordMetric('memory_usage_percent', memoryUsagePercent);
      
      return NextResponse.json(healthData, { 
        status: healthData.status === 'healthy' ? 200 : 200,
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    log.error('健康检查失败', {
      module: 'HEALTH_API',
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    const memUsage = process.memoryUsage();
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      requestId,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'UnknownError'
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 10000) / 100
      },
      metrics: {
        requests: metricsCollector.getRequestStats(),
        healthCheckDuration: duration
      }
    };
    
    return NextResponse.json(errorData, { 
      status: 503,
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

// 支持 HEAD 请求用于简单的存活检查
export async function HEAD(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || `head_${Date.now()}`;
  
  try {
    const dbPool = getPool();
    const client = await dbPool.connect();
    
    try {
      await client.query('SELECT 1');
      const duration = Date.now() - startTime;
      
      log.debug('HEAD健康检查成功', {
        module: 'HEALTH_API',
        requestId,
        duration
      });
      
      return new NextResponse(null, { 
        status: 200,
        headers: {
          'X-Request-ID': requestId
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    log.warn('HEAD健康检查失败', {
      module: 'HEALTH_API',
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return new NextResponse(null, { 
      status: 503,
      headers: {
        'X-Request-ID': requestId
      }
    });
  }
}