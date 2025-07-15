/**
 * Performance monitoring utilities for DeGarda
 * Tracks execution times and system performance
 */

import { logger } from './logger'

export interface PerformanceMetrics {
  operation: string
  duration: number
  timestamp: string
  memory?: {
    used: number
    total: number
  }
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics
  
  private getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage()
      return {
        used: Math.round(mem.heapUsed / 1024 / 1024), // MB
        total: Math.round(mem.heapTotal / 1024 / 1024) // MB
      }
    }
    return undefined
  }
  
  startTiming(operation: string, metadata?: Record<string, any>) {
    return {
      operation,
      metadata,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage()
    }
  }
  
  endTiming(timer: ReturnType<typeof this.startTiming>) {
    const duration = performance.now() - timer.startTime
    const endMemory = this.getMemoryUsage()
    
    const metric: PerformanceMetrics = {
      operation: timer.operation,
      duration,
      timestamp: new Date().toISOString(),
      memory: endMemory,
      metadata: timer.metadata
    }
    
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
    
    // Log slow operations
    if (duration > 1000) { // Slower than 1 second
      logger.warn('Performance', 'Slow operation detected', {
        operation: timer.operation,
        duration: `${duration.toFixed(2)}ms`,
        metadata: timer.metadata
      })
    } else if (duration > 100) { // Slower than 100ms
      logger.debug('Performance', 'Operation completed', {
        operation: timer.operation,
        duration: `${duration.toFixed(2)}ms`,
        metadata: timer.metadata
      })
    }
    
    return metric
  }
  
  getMetrics(operation?: string): PerformanceMetrics[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation)
    }
    return [...this.metrics]
  }
  
  getAverageTime(operation: string): number {
    const operationMetrics = this.getMetrics(operation)
    if (operationMetrics.length === 0) return 0
    
    const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0)
    return total / operationMetrics.length
  }
  
  getSlowestOperations(limit = 10): PerformanceMetrics[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }
  
  clearMetrics() {
    this.metrics = []
  }
  
  // Utility wrapper for automatic timing
  async time<T>(
    operation: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timer = this.startTiming(operation, metadata)
    try {
      const result = await fn()
      this.endTiming(timer)
      return result
    } catch (error) {
      const metric = this.endTiming(timer)
      logger.error('Performance', 'Operation failed', {
        operation,
        duration: `${metric.duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata
      })
      throw error
    }
  }
}

export const performanceMonitor = new PerformanceMonitor()

// Decorator for automatic performance monitoring
export function monitored(operation?: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const operationName = operation || `${target.constructor.name}.${propertyKey}`
    
    descriptor.value = async function(...args: any[]) {
      return performanceMonitor.time(
        operationName,
        () => originalMethod.apply(this, args),
        { args: args.length }
      )
    }
    
    return descriptor
  }
}