type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data
    };
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const entry = this.formatMessage(level, message, data);
    
    if (this.isDevelopment) {
      // Pretty console output for development
      const emoji = {
        info: '📝',
        warn: '⚠️',
        error: '❌',
        debug: '🔍'
      }[level];
      
      console.log(`${emoji} [${entry.timestamp}] ${message}`);
      if (data) {
        console.log('   Data:', data);
      }
    } else {
      // JSON output for production
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      this.log('debug', message, data);
    }
  }
}

export const logger = new Logger(); 