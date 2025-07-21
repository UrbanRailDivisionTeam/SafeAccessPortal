import { NextRequest, NextResponse } from 'next/server';
import { log, AppError, ErrorCode, createError } from '@/lib/logger';
import { ZodError } from 'zod';

// 错误响应接口
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
    timestamp: string;
  };
}

// 用户友好的错误消息映射
const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.SYSTEM_ERROR]: '系统暂时不可用，请稍后重试',
  [ErrorCode.DATABASE_ERROR]: '数据处理异常，请稍后重试',
  [ErrorCode.NETWORK_ERROR]: '网络连接异常，请检查网络后重试',
  [ErrorCode.CONFIG_ERROR]: '系统配置异常，请联系管理员',
  [ErrorCode.AUTH_FAILED]: '身份验证失败，请重新登录',
  [ErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ErrorCode.PERMISSION_DENIED]: '权限不足，无法执行此操作',
  [ErrorCode.VALIDATION_ERROR]: '输入信息有误，请检查后重新提交',
  [ErrorCode.DUPLICATE_SUBMISSION]: '请勿重复提交，请稍后再试',
  [ErrorCode.BUSINESS_RULE_VIOLATION]: '操作违反业务规则，请检查后重试',
  [ErrorCode.EXTERNAL_API_ERROR]: '外部服务暂时不可用，请稍后重试',
  [ErrorCode.SYNC_ERROR]: '数据同步异常，请稍后重试'
};

// 错误分类函数
function categorizeError(error: Error): { code: ErrorCode; statusCode: number; isOperational: boolean } {
  // 应用自定义错误
  if (error instanceof AppError) {
    return {
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational
    };
  }
  
  // Zod验证错误
  if (error instanceof ZodError) {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 400,
      isOperational: true
    };
  }
  
  // 数据库错误
  if (error.message.includes('database') || error.message.includes('connection')) {
    return {
      code: ErrorCode.DATABASE_ERROR,
      statusCode: 500,
      isOperational: true
    };
  }
  
  // 网络错误
  if (error.message.includes('fetch') || error.message.includes('timeout')) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      statusCode: 502,
      isOperational: true
    };
  }
  
  // 权限错误
  if (error.message.includes('permission') || error.message.includes('unauthorized')) {
    return {
      code: ErrorCode.PERMISSION_DENIED,
      statusCode: 403,
      isOperational: true
    };
  }
  
  // 默认系统错误
  return {
    code: ErrorCode.SYSTEM_ERROR,
    statusCode: 500,
    isOperational: false
  };
}

// 格式化Zod验证错误
function formatZodError(error: ZodError): any {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
}

// 生成错误响应
function createErrorResponse(
  error: Error,
  requestId?: string,
  includeStack: boolean = false
): ErrorResponse {
  const { code, statusCode } = categorizeError(error);
  const userMessage = USER_FRIENDLY_MESSAGES[code] || '系统异常，请稍后重试';
  
  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode[code],
      message: userMessage,
      requestId,
      timestamp: new Date().toISOString()
    }
  };
  
  // 开发环境或特定错误类型包含详细信息
  if (process.env.NODE_ENV === 'development' || error instanceof ZodError) {
    if (error instanceof ZodError) {
      response.error.details = formatZodError(error);
    } else if (includeStack) {
      response.error.details = {
        originalMessage: error.message,
        stack: error.stack
      };
    }
  }
  
  return response;
}

// 全局错误处理中间件
export function createErrorHandler() {
  return function errorHandler(error: Error, request?: NextRequest): NextResponse {
    const requestId = request?.headers.get('x-request-id') || 'unknown';
    const { code, statusCode, isOperational } = categorizeError(error);
    
    // 记录错误日志
    const logContext = {
      module: 'ERROR_HANDLER',
      requestId,
      userId: request ? getUserIdFromRequest(request) : undefined,
      ip: request ? getClientIP(request) : undefined,
      url: request?.url,
      method: request?.method,
      errorCode: code,
      isOperational
    };
    
    if (isOperational) {
      log.warn(`可操作错误: ${error.message}`, logContext);
    } else {
      log.error(`系统错误: ${error.message}`, logContext, error);
    }
    
    // 生成错误响应
    const errorResponse = createErrorResponse(error, requestId, !isOperational);
    
    return NextResponse.json(errorResponse, { status: statusCode });
  };
}

// API路由错误处理装饰器
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async function errorHandledRoute(...args: T): Promise<NextResponse> {
    try {
      return await handler(...args);
    } catch (error) {
      const request = args.find(arg => arg && typeof arg === 'object' && 'method' in arg) as NextRequest | undefined;
      return createErrorHandler()(error as Error, request);
    }
  };
}

// 异步操作错误处理装饰器
export function withAsyncErrorHandling<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  context: { module: string; action: string }
) {
  return async function errorHandledOperation(...args: T): Promise<R> {
    try {
      return await operation(...args);
    } catch (error) {
      const logContext = {
        module: context.module,
        action: context.action,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      log.error(`异步操作失败: ${context.module}.${context.action}`, logContext, error as Error);
      
      // 重新抛出错误，让上层处理
      throw error;
    }
  };
}

// 数据库操作错误处理
export function handleDatabaseError(error: any, operation: string, table?: string): never {
  let errorMessage = `数据库操作失败: ${operation}`;
  let errorCode = ErrorCode.DATABASE_ERROR;
  
  if (table) {
    errorMessage += ` (表: ${table})`;
  }
  
  // 根据具体的数据库错误类型进行分类
  if (error.code === 'ECONNREFUSED') {
    errorMessage = '数据库连接被拒绝';
  } else if (error.code === 'ETIMEDOUT') {
    errorMessage = '数据库连接超时';
  } else if (error.code === '23505') { // PostgreSQL unique violation
    errorMessage = '数据已存在，请勿重复提交';
    errorCode = ErrorCode.DUPLICATE_SUBMISSION;
  } else if (error.code === '23503') { // PostgreSQL foreign key violation
    errorMessage = '关联数据不存在';
    errorCode = ErrorCode.BUSINESS_RULE_VIOLATION;
  } else if (error.code === '23502') { // PostgreSQL not null violation
    errorMessage = '必填字段不能为空';
    errorCode = ErrorCode.VALIDATION_ERROR;
  }
  
  throw createError.database(errorMessage, {
    originalError: error.message,
    code: error.code,
    operation,
    table
  });
}

// 外部API错误处理
export function handleExternalApiError(error: any, apiName: string, endpoint?: string): never {
  let errorMessage = `外部API调用失败: ${apiName}`;
  
  if (endpoint) {
    errorMessage += ` (${endpoint})`;
  }
  
  // 根据HTTP状态码分类
  if (error.status) {
    switch (error.status) {
      case 400:
        errorMessage = `外部API请求参数错误: ${apiName}`;
        break;
      case 401:
        errorMessage = `外部API认证失败: ${apiName}`;
        break;
      case 403:
        errorMessage = `外部API权限不足: ${apiName}`;
        break;
      case 404:
        errorMessage = `外部API接口不存在: ${apiName}`;
        break;
      case 429:
        errorMessage = `外部API请求频率过高: ${apiName}`;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorMessage = `外部API服务异常: ${apiName}`;
        break;
    }
  }
  
  throw createError.external(errorMessage, {
    apiName,
    endpoint,
    status: error.status,
    originalError: error.message
  });
}

// 业务规则验证错误处理
export function handleBusinessRuleError(rule: string, details?: any): never {
  const errorMessage = `业务规则验证失败: ${rule}`;
  
  throw new AppError(
    errorMessage,
    ErrorCode.BUSINESS_RULE_VIOLATION,
    400,
    true,
    { rule, details }
  );
}

// 辅助函数：从请求中获取用户ID
function getUserIdFromRequest(request: NextRequest): string | undefined {
  // 从Authorization header获取
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // 解析JWT token获取用户ID
      // 实际实现需要根据认证方案调整
      return undefined;
    } catch {
      return undefined;
    }
  }
  
  // 从cookie获取
  const userCookie = request.cookies.get('user');
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      return user.id;
    } catch {
      return undefined;
    }
  }
  
  return undefined;
}

// 辅助函数：获取客户端IP
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

// 错误恢复策略
export class ErrorRecoveryStrategy {
  private static retryableErrors = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.EXTERNAL_API_ERROR,
    ErrorCode.DATABASE_ERROR
  ];
  
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        const { code, isOperational } = categorizeError(lastError);
        
        // 只重试可重试的错误
        if (!isOperational || !this.retryableErrors.includes(code)) {
          throw lastError;
        }
        
        // 最后一次尝试失败，直接抛出错误
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        
        log.warn(`操作重试 (${attempt}/${maxRetries})`, {
          module: 'ERROR_RECOVERY',
          attempt,
          maxRetries,
          error: lastError.message
        });
      }
    }
    
    throw lastError!;
  }
  
  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    failureThreshold: number = 5,
    resetTimeout: number = 60000
  ): Promise<T> {
    // 简单的断路器实现
    // 实际生产环境建议使用专业的断路器库
    const key = operation.toString();
    const state = this.getCircuitState(key);
    
    if (state.isOpen && Date.now() - state.lastFailureTime < resetTimeout) {
      throw createError.system('服务暂时不可用，请稍后重试');
    }
    
    try {
      const result = await operation();
      this.resetCircuitState(key);
      return result;
    } catch (error) {
      this.recordFailure(key);
      
      if (this.getFailureCount(key) >= failureThreshold) {
        this.openCircuit(key);
      }
      
      throw error;
    }
  }
  
  private static circuitStates = new Map<string, {
    failureCount: number;
    lastFailureTime: number;
    isOpen: boolean;
  }>();
  
  private static getCircuitState(key: string) {
    return this.circuitStates.get(key) || {
      failureCount: 0,
      lastFailureTime: 0,
      isOpen: false
    };
  }
  
  private static recordFailure(key: string) {
    const state = this.getCircuitState(key);
    state.failureCount++;
    state.lastFailureTime = Date.now();
    this.circuitStates.set(key, state);
  }
  
  private static getFailureCount(key: string): number {
    return this.getCircuitState(key).failureCount;
  }
  
  private static openCircuit(key: string) {
    const state = this.getCircuitState(key);
    state.isOpen = true;
    this.circuitStates.set(key, state);
  }
  
  private static resetCircuitState(key: string) {
    this.circuitStates.set(key, {
      failureCount: 0,
      lastFailureTime: 0,
      isOpen: false
    });
  }
}

export default createErrorHandler;