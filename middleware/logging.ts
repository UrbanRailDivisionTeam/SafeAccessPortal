import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { log, LogContext } from '@/lib/logger';

// 请求上下文接口
interface RequestContext extends LogContext {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  startTime: number;
}

// 获取客户端IP地址
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (remoteAddr) {
    return remoteAddr;
  }
  return 'unknown';
}

// 获取用户ID（从token或session中）
function getUserId(request: NextRequest): string | undefined {
  // 从Authorization header获取token
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // 这里应该解析JWT token获取用户ID
      // 暂时返回undefined，实际实现需要根据认证方案调整
      return undefined;
    } catch (error) {
      return undefined;
    }
  }
  
  // 从cookie获取用户信息
  const userCookie = request.cookies.get('user');
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      return user.id;
    } catch (error) {
      return undefined;
    }
  }
  
  return undefined;
}

// 判断是否为敏感路径
function isSensitivePath(pathname: string): boolean {
  const sensitivePatterns = [
    '/api/auth',
    '/api/admin',
    '/api/user/profile',
    '/api/safety/export'
  ];
  
  return sensitivePatterns.some(pattern => pathname.startsWith(pattern));
}

// 过滤敏感数据
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth',
    'idCard', 'phone', 'email', 'bankCard'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      if (typeof sanitized[field] === 'string') {
        // 保留前2位和后2位，中间用*替换
        const value = sanitized[field];
        if (value.length > 4) {
          sanitized[field] = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
        } else {
          sanitized[field] = '*'.repeat(value.length);
        }
      } else {
        sanitized[field] = '[REDACTED]';
      }
    }
  }
  
  return sanitized;
}

// HTTP请求日志中间件
export function createLoggingMiddleware() {
  return async function loggingMiddleware(request: NextRequest) {
    const startTime = Date.now();
    const requestId = uuidv4();
    const userId = getUserId(request);
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const context: RequestContext = {
      module: 'HTTP',
      requestId,
      userId,
      ip,
      userAgent,
      method: request.method,
      url: request.url,
      startTime
    };
    
    // 记录请求开始
    log.info(`HTTP请求开始: ${request.method} ${request.nextUrl.pathname}`, {
      ...context,
      query: Object.fromEntries(request.nextUrl.searchParams),
      headers: isSensitivePath(request.nextUrl.pathname) ? '[REDACTED]' : Object.fromEntries(request.headers)
    });
    
    // 如果是POST/PUT/PATCH请求，记录请求体（需要克隆请求）
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const clonedRequest = request.clone();
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const body = await clonedRequest.json();
          log.debug('请求体内容', {
            ...context,
            body: sanitizeData(body)
          });
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await clonedRequest.formData();
          const formObject = Object.fromEntries(formData);
          log.debug('表单数据', {
            ...context,
            formData: sanitizeData(formObject)
          });
        }
      } catch (error) {
        log.warn('无法解析请求体', { ...context, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    // 继续处理请求
    let response: NextResponse | undefined;
    try {
      response = NextResponse.next();
      
      // 添加请求ID到响应头
      response.headers.set('X-Request-ID', requestId);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      log.error(`HTTP请求异常: ${request.method} ${request.nextUrl.pathname}`, {
        ...context,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error as Error);
      
      throw error;
    } finally {
      // 记录请求完成（在finally中确保一定会执行）
      const duration = Date.now() - startTime;
      const statusCode = response?.status || 500;
      
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
      const logMessage = `HTTP请求完成: ${request.method} ${request.nextUrl.pathname} - ${statusCode}`;
      
      const finalContext = {
        ...context,
        duration,
        statusCode,
        category: 'http'
      };
      
      if (logLevel === 'error') {
        log.error(logMessage, finalContext);
      } else if (logLevel === 'warn') {
        log.warn(logMessage, finalContext);
      } else {
        log.info(logMessage, finalContext);
      }
      
      // 性能监控
      if (duration > 1000) {
        log.performance(`慢请求: ${request.method} ${request.nextUrl.pathname}`, {
          ...context,
          duration,
          threshold: 1000
        });
      }
    }
  };
}

// API路由日志装饰器
export function withLogging<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  module: string,
  action: string
) {
  return async function loggedHandler(...args: T): Promise<R> {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    // 尝试从参数中提取请求信息
    const request = args.find(arg => arg && typeof arg === 'object' && 'method' in arg) as NextRequest | undefined;
    const userId = request ? getUserId(request) : undefined;
    const ip = request ? getClientIP(request) : undefined;
    
    const context: LogContext = {
      module,
      action,
      requestId,
      userId,
      ip
    };
    
    log.info(`开始执行: ${module}.${action}`, context);
    
    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      
      log.business(`执行成功: ${module}.${action}`, {
        ...context,
        duration,
        result: 'success'
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      log.error(`执行失败: ${module}.${action}`, {
        ...context,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error as Error);
      
      throw error;
    }
  };
}

// 数据库操作日志装饰器
export function withDatabaseLogging<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  tableName: string,
  operationType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
) {
  return async function loggedOperation(...args: T): Promise<R> {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    const context: LogContext = {
      module: 'DATABASE',
      action: `${operationType}_${tableName}`,
      requestId
    };
    
    log.debug(`数据库操作开始: ${operationType} ${tableName}`, context);
    
    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      
      log.info(`数据库操作成功: ${operationType} ${tableName}`, {
        ...context,
        duration,
        category: 'database'
      });
      
      // 性能监控
      if (duration > 200) {
        log.performance(`慢查询: ${operationType} ${tableName}`, {
          ...context,
          duration,
          threshold: 200
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      log.error(`数据库操作失败: ${operationType} ${tableName}`, {
        ...context,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error as Error);
      
      throw error;
    }
  };
}

export default createLoggingMiddleware;