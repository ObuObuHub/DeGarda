/**
 * Centralized logging system for DeGarda
 * Replaces scattered console.log and debug routes with proper structured logging
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: Record<string, unknown> | string | number | boolean | null
  userId?: string
  hospitalId?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  
  private formatLog(level: LogLevel, module: string, message: string, data?: any, context?: { userId?: string, hospitalId?: string }): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
      userId: context?.userId,
      hospitalId: context?.hospitalId
    }
  }
  
  private output(entry: LogEntry) {
    if (this.isDevelopment) {
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`
      
      switch (entry.level) {
        case LogLevel.ERROR:
          console.error(prefix, entry.message, entry.data || '')
          break
        case LogLevel.WARN:
          console.warn(prefix, entry.message, entry.data || '')
          break
        case LogLevel.INFO:
          console.info(prefix, entry.message, entry.data || '')
          break
        case LogLevel.DEBUG:
          console.debug(prefix, entry.message, entry.data || '')
          break
      }
    } else {
      // In production, could send to monitoring service
      // For now, only log errors and warnings
      if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
        console.log(JSON.stringify(entry))
      }
    }
  }
  
  error(module: string, message: string, data?: any, context?: { userId?: string, hospitalId?: string }) {
    this.output(this.formatLog(LogLevel.ERROR, module, message, data, context))
  }
  
  warn(module: string, message: string, data?: any, context?: { userId?: string, hospitalId?: string }) {
    this.output(this.formatLog(LogLevel.WARN, module, message, data, context))
  }
  
  info(module: string, message: string, data?: any, context?: { userId?: string, hospitalId?: string }) {
    this.output(this.formatLog(LogLevel.INFO, module, message, data, context))
  }
  
  debug(module: string, message: string, data?: any, context?: { userId?: string, hospitalId?: string }) {
    if (this.isDevelopment) {
      this.output(this.formatLog(LogLevel.DEBUG, module, message, data, context))
    }
  }
  
  // Specialized methods for common operations
  shiftGeneration(message: string, data?: any, context?: { userId?: string, hospitalId?: string }) {
    this.info('ShiftGenerator', message, data, context)
  }
  
  dbOperation(message: string, data?: any, context?: { userId?: string, hospitalId?: string }) {
    this.debug('Database', message, data, context)
  }
  
  apiRequest(method: string, path: string, data?: any, context?: { userId?: string, hospitalId?: string }) {
    this.debug('API', `${method} ${path}`, data, context)
  }
}

export const logger = new Logger()