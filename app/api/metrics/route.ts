import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';
import { metricsCollector } from '@/lib/monitoring';

/**
 * 获取系统监控指标
 * GET /api/metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || `metrics_${Date.now()}`;
  
  log.debug('指标查询请求开始', {
    module: 'METRICS_API',
    requestId,
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  });
  
  try {
    // 获取所有监控指标
    const metrics = {
      timestamp: new Date().toISOString(),
      requestId,
      system: {
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      },
      memory: {
        ...process.memoryUsage(),
        percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 10000) / 100
      },
      requests: metricsCollector.getRequestStats(),
      performance: metricsCollector.getPerformanceMetrics(),
      errors: metricsCollector.getErrorStats(),
      database: metricsCollector.getDatabaseStats(),
      custom: metricsCollector.getCustomMetrics()
    };
    
    const duration = Date.now() - startTime;
    
    log.info('指标查询完成', {
      module: 'METRICS_API',
      requestId,
      duration,
      metricsCount: Object.keys(metrics).length
    });
    
    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    log.error('指标查询失败', {
      module: 'METRICS_API',
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    return NextResponse.json({
      error: {
        message: '获取监控指标失败',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId
      }
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * 重置指标统计
 * DELETE /api/metrics
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || `metrics_reset_${Date.now()}`;
  
  log.info('指标重置请求开始', {
    module: 'METRICS_API',
    requestId,
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  });
  
  try {
    // 重置指标统计
    metricsCollector.resetMetrics();
    
    const duration = Date.now() - startTime;
    
    log.info('指标重置完成', {
      module: 'METRICS_API',
      requestId,
      duration
    });
    
    return NextResponse.json({
      message: '监控指标已重置',
      timestamp: new Date().toISOString(),
      requestId
    }, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    log.error('指标重置失败', {
      module: 'METRICS_API',
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    return NextResponse.json({
      error: {
        message: '重置监控指标失败',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId
      }
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'Content-Type': 'application/json'
      }
    });
  }
}