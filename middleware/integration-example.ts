/**
 * 中间件集成示例
 * 展示如何在现有API路由中集成日志记录、错误处理和监控功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from './logging';
import { withErrorHandling } from './error-handler';
import { createMonitoringMiddleware } from '@/lib/monitoring';
import { log } from '@/lib/logger';

// 创建监控中间件实例
const monitoringMiddleware = createMonitoringMiddleware();

/**
 * 组合中间件装饰器
 * 将日志、错误处理和监控功能组合在一起
 */
export function withFullMiddleware<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return withErrorHandling(
    withLogging(
      async (request: NextRequest, ...args: T) => {
        // 执行原始处理器
        const response = await handler(request, ...args);
        // 应用监控中间件
        const monitor = monitoringMiddleware(request);
        return await monitor(response);
      },
      'API',
      'REQUEST'
    )
  );
}

/**
 * 示例：如何在现有API路由中使用完整中间件
 */

// 原始API处理函数
async function originalApiHandler(request: NextRequest): Promise<NextResponse> {
  // 模拟业务逻辑
  const data = { message: 'Hello World', timestamp: new Date().toISOString() };
  return NextResponse.json(data);
}

// 使用完整中间件包装的API处理函数
export const enhancedApiHandler = withFullMiddleware(originalApiHandler);

/**
 * 示例：手动集成日志和监控的API路由
 */
export async function manualIntegrationExample(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;
  
  // 记录请求开始
  log.info('API请求开始', {
    module: 'EXAMPLE_API',
    requestId,
    method: request.method,
    url: request.url,
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  });
  
  try {
    // 业务逻辑处理
    const result = await processBusinessLogic(request);
    
    const duration = Date.now() - startTime;
    
    // 记录成功响应
    log.info('API请求成功', {
      module: 'EXAMPLE_API',
      requestId,
      duration,
      statusCode: 200
    });
    
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // 记录错误
    log.error('API请求失败', {
      module: 'EXAMPLE_API',
      requestId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    return NextResponse.json({
      error: {
        message: '处理请求时发生错误',
        requestId,
        timestamp: new Date().toISOString()
      }
    }, {
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': `${duration}ms`
      }
    });
  }
}

// 模拟业务逻辑处理函数
async function processBusinessLogic(request: NextRequest) {
  // 模拟一些异步操作
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    success: true,
    data: {
      message: '业务逻辑处理成功',
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url
    }
  };
}

/**
 * 数据库操作示例
 * 展示如何在数据库操作中集成日志记录
 */
export async function databaseOperationExample() {
  const operationId = `db_${Date.now()}`;
  
  log.info('数据库操作开始', {
    module: 'DATABASE',
    operationId,
    operation: 'SELECT',
    table: 'users'
  });
  
  const startTime = Date.now();
  
  try {
    // 模拟数据库查询
    const result = await mockDatabaseQuery();
    
    const duration = Date.now() - startTime;
    
    log.info('数据库操作成功', {
      module: 'DATABASE',
      operationId,
      duration,
      rowsAffected: result.length
    });
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    log.error('数据库操作失败', {
      module: 'DATABASE',
      operationId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    throw error;
  }
}

// 模拟数据库查询
async function mockDatabaseQuery() {
  await new Promise(resolve => setTimeout(resolve, 50));
  return [
    { id: 1, name: 'User 1' },
    { id: 2, name: 'User 2' }
  ];
}

/**
 * 外部API调用示例
 * 展示如何在调用外部服务时集成日志记录
 */
export async function externalApiCallExample(url: string) {
  const callId = `ext_${Date.now()}`;
  
  log.info('外部API调用开始', {
    module: 'EXTERNAL_API',
    callId,
    url,
    method: 'GET'
  });
  
  const startTime = Date.now();
  
  try {
    // 模拟外部API调用
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'SafeAccessPortal/1.0',
        'Accept': 'application/json'
      }
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    log.info('外部API调用成功', {
      module: 'EXTERNAL_API',
      callId,
      duration,
      statusCode: response.status,
      responseSize: JSON.stringify(data).length
    });
    
    return data;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    log.error('外部API调用失败', {
      module: 'EXTERNAL_API',
      callId,
      duration,
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    throw error;
  }
}

/**
 * 业务规则验证示例
 * 展示如何在业务逻辑中集成日志记录
 */
export function validateBusinessRules(data: any) {
  const validationId = `val_${Date.now()}`;
  
  log.debug('业务规则验证开始', {
    module: 'VALIDATION',
    validationId,
    dataKeys: Object.keys(data)
  });
  
  const errors: string[] = [];
  
  try {
    // 示例验证规则
    if (!data.name || data.name.trim().length === 0) {
      errors.push('姓名不能为空');
    }
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('邮箱格式不正确');
    }
    
    if (data.age && (data.age < 18 || data.age > 100)) {
      errors.push('年龄必须在18-100之间');
    }
    
    if (errors.length > 0) {
      log.warn('业务规则验证失败', {
        module: 'VALIDATION',
        validationId,
        errors,
        dataKeys: Object.keys(data)
      });
      
      return { valid: false, errors };
    }
    
    log.debug('业务规则验证成功', {
      module: 'VALIDATION',
      validationId
    });
    
    return { valid: true, errors: [] };
    
  } catch (error) {
    log.error('业务规则验证异常', {
      module: 'VALIDATION',
      validationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, error as Error);
    
    throw error;
  }
}