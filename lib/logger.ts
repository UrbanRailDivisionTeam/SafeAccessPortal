import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// 确保日志目录存在
const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志级别定义
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// 日志上下文接口
export interface LogContext {
  userId?: string;
  requestId?: string;
  module: string;
  action?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  [key: string]: any;
}

// 自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, module, userId, requestId, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      module: module || 'UNKNOWN',
      userId: userId || 'anonymous',
      requestId: requestId || 'no-request-id',
      message,
      ...meta
    };
    return JSON.stringify(logEntry);
  })
);

// 创建Winston logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'safe-access-portal',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // 控制台输出（开发环境）
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: process.env.NODE_ENV === 'production'
    }),
    
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      tailable: true
    }),
    
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 30,
      tailable: true
    }),
    
    // 按日期轮转的日志文件
    new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '30d'
    })
  ],
  
  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  
  // 拒绝处理
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// 日志记录类
export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;
  
  private constructor() {
    this.winston = logger;
  }
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  // 错误日志
  error(message: string, context: LogContext, error?: Error) {
    this.winston.error(message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
  
  // 警告日志
  warn(message: string, context: LogContext) {
    this.winston.warn(message, context);
  }
  
  // 信息日志
  info(message: string, context: LogContext) {
    this.winston.info(message, context);
  }
  
  // 调试日志
  debug(message: string, context: LogContext) {
    this.winston.debug(message, context);
  }
  
  // 业务操作日志
  business(action: string, context: LogContext & { result?: 'success' | 'failure' }) {
    this.info(`业务操作: ${action}`, {
      ...context,
      category: 'business'
    });
  }
  
  // 安全日志
  security(event: string, context: LogContext & { risk?: 'low' | 'medium' | 'high' }) {
    this.warn(`安全事件: ${event}`, {
      ...context,
      category: 'security'
    });
  }
  
  // 性能日志
  performance(operation: string, context: LogContext & { duration: number }) {
    const level = context.duration > 1000 ? 'warn' : 'info';
    this.winston.log(level, `性能监控: ${operation}`, {
      ...context,
      category: 'performance'
    });
  }
  
  // 审计日志
  audit(action: string, context: LogContext & { target?: string; changes?: any }) {
    this.info(`审计记录: ${action}`, {
      ...context,
      category: 'audit'
    });
  }
}

// 导出单例实例
export const appLogger = Logger.getInstance();

// 便捷函数
export const log = {
  error: (message: string, context: LogContext, error?: Error) => 
    appLogger.error(message, context, error),
  warn: (message: string, context: LogContext) => 
    appLogger.warn(message, context),
  info: (message: string, context: LogContext) => 
    appLogger.info(message, context),
  debug: (message: string, context: LogContext) => 
    appLogger.debug(message, context),
  business: (action: string, context: LogContext & { result?: 'success' | 'failure' }) => 
    appLogger.business(action, context),
  security: (event: string, context: LogContext & { risk?: 'low' | 'medium' | 'high' }) => 
    appLogger.security(event, context),
  performance: (operation: string, context: LogContext & { duration: number }) => 
    appLogger.performance(operation, context),
  audit: (action: string, context: LogContext & { target?: string; changes?: any }) => 
    appLogger.audit(action, context)
};

// 错误代码定义
export enum ErrorCode {
  // 系统错误 (1000-1999)
  SYSTEM_ERROR = 1000,
  DATABASE_ERROR = 1001,
  NETWORK_ERROR = 1002,
  CONFIG_ERROR = 1003,
  
  // 认证错误 (2000-2999)
  AUTH_FAILED = 2000,
  TOKEN_EXPIRED = 2001,
  PERMISSION_DENIED = 2002,
  
  // 业务错误 (3000-3999)
  VALIDATION_ERROR = 3000,
  DUPLICATE_SUBMISSION = 3001,
  BUSINESS_RULE_VIOLATION = 3002,
  
  // 外部服务错误 (4000-4999)
  EXTERNAL_API_ERROR = 4000,
  SYNC_ERROR = 4001
}

// 应用错误类
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: any;
  
  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误工厂函数
export const createError = {
  system: (message: string, context?: any) => 
    new AppError(message, ErrorCode.SYSTEM_ERROR, 500, true, context),
  database: (message: string, context?: any) => 
    new AppError(message, ErrorCode.DATABASE_ERROR, 500, true, context),
  auth: (message: string, context?: any) => 
    new AppError(message, ErrorCode.AUTH_FAILED, 401, true, context),
  permission: (message: string, context?: any) => 
    new AppError(message, ErrorCode.PERMISSION_DENIED, 403, true, context),
  validation: (message: string, context?: any) => 
    new AppError(message, ErrorCode.VALIDATION_ERROR, 400, true, context),
  duplicate: (message: string, context?: any) => 
    new AppError(message, ErrorCode.DUPLICATE_SUBMISSION, 409, true, context),
  external: (message: string, context?: any) => 
    new AppError(message, ErrorCode.EXTERNAL_API_ERROR, 502, true, context)
};

export default logger;