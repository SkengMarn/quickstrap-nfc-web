/**
 * Professional Logging Service
 * Replaces console.log/error with structured logging
 * Supports different log levels and production-safe logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private isDevelopment: boolean;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private userId?: string;
  private sessionId?: string;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.sessionId = this.generateSessionId();
  }

  /**
   * Set user ID for all subsequent logs
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Clear user ID (on logout)
   */
  clearUserId() {
    this.userId = undefined;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      error,
      userId: this.userId,
      sessionId: this.sessionId,
    };
  }

  /**
   * Store log entry in memory
   */
  private storeLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }
  }

  /**
   * Format log for console output
   */
  private formatConsoleLog(entry: LogEntry): string[] {
    const parts: string[] = [];

    // Timestamp
    const time = new Date(entry.timestamp).toLocaleTimeString();
    parts.push(`[${time}]`);

    // Level with emoji
    const levelEmojis: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      fatal: '💀',
    };
    parts.push(`${levelEmojis[entry.level]} ${entry.level.toUpperCase()}`);

    // Context if provided
    if (entry.context) {
      parts.push(`[${entry.context}]`);
    }

    // Message
    parts.push(entry.message);

    return parts;
  }

  /**
   * Output log to console (development only)
   */
  private outputToConsole(entry: LogEntry) {
    if (!this.isDevelopment) return;

    const formattedParts = this.formatConsoleLog(entry);
    const message = formattedParts.join(' ');

    // Output based on level
    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(message, entry.data || '');
        break;
      case 'warn':
        console.warn(message, entry.data || '');
        break;
      case 'error':
      case 'fatal':
        console.error(message, entry.error || entry.data || '');
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  /**
   * Send log to remote service (production)
   */
  private async sendToRemote(entry: LogEntry) {
    // Only send errors and fatals to remote in production
    if (this.isDevelopment || (entry.level !== 'error' && entry.level !== 'fatal')) {
      return;
    }

    try {
      // TODO: Implement remote logging service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry),
      // });
    } catch (error) {
      // Fail silently - don't want logging to break the app
      console.error('Failed to send log to remote:', error);
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
    error?: Error
  ) {
    const entry = this.createLogEntry(level, message, context, data, error);

    this.storeLog(entry);
    this.outputToConsole(entry);
    this.sendToRemote(entry);
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: string, data?: unknown) {
    if (this.isDevelopment) {
      this.log('debug', message, context, data);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: string, data?: unknown) {
    this.log('info', message, context, data);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: string, data?: unknown) {
    this.log('warn', message, context, data);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: string, error?: Error | unknown, data?: unknown) {
    const errorObj = error instanceof Error ? error : undefined;
    const errorData = error instanceof Error ? data : error;
    this.log('error', message, context, errorData, errorObj);
  }

  /**
   * Fatal error logging (critical errors that require immediate attention)
   */
  fatal(message: string, context?: string, error?: Error | unknown, data?: unknown) {
    const errorObj = error instanceof Error ? error : undefined;
    const errorData = error instanceof Error ? data : error;
    this.log('fatal', message, context, errorData, errorObj);
  }

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs filtered by context
   */
  getLogsByContext(context: string): LogEntry[] {
    return this.logs.filter(log => log.context === context);
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Download logs as a file
   */
  downloadLogs() {
    const dataStr = this.exportLogs();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quickstrap-logs-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export const logDebug = (message: string, context?: string, data?: unknown) =>
  logger.debug(message, context, data);

export const logInfo = (message: string, context?: string, data?: unknown) =>
  logger.info(message, context, data);

export const logWarn = (message: string, context?: string, data?: unknown) =>
  logger.warn(message, context, data);

export const logError = (message: string, context?: string, error?: Error | unknown, data?: unknown) =>
  logger.error(message, context, error, data);

export const logFatal = (message: string, context?: string, error?: Error | unknown, data?: unknown) =>
  logger.fatal(message, context, error, data);

export default logger;
