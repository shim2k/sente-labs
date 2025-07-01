import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Configure winston logger specifically for worker
const workerLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      let log = `${timestamp} [WORKER][${level.toUpperCase()}]: ${message}`;
      
      // Add stack trace for errors
      if (stack) {
        log += `\n${stack}`;
      }
      
      // Add metadata if present
      if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
      }
      
      return log;
    })
  ),
  transports: [
    // Console output with worker prefix
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [WORKER][${level}]: ${message}`;
        })
      )
    }),
    
    // Worker-specific log files
    new winston.transports.File({
      filename: path.join(logsDir, 'worker.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Worker error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'worker-error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Also log to combined log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions and rejections for worker
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'worker-exceptions.log')
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'worker-rejections.log')
    })
  ]
});

// Create logs directory
import fs from 'fs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Override console methods for worker to use worker logger
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

console.log = (...args: any[]) => {
  workerLogger.info(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
  originalConsole.log(`[WORKER]`, ...args);
};

console.info = (...args: any[]) => {
  workerLogger.info(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
  originalConsole.info(`[WORKER]`, ...args);
};

console.warn = (...args: any[]) => {
  workerLogger.warn(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
  originalConsole.warn(`[WORKER]`, ...args);
};

console.error = (...args: any[]) => {
  workerLogger.error(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
  originalConsole.error(`[WORKER]`, ...args);
};

console.debug = (...args: any[]) => {
  workerLogger.debug(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' '));
  originalConsole.debug(`[WORKER]`, ...args);
};

export default workerLogger;