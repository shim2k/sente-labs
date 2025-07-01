import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface LoggedRequest extends Request {
  startTime?: number;
}

export const responseLogger = (req: LoggedRequest, res: Response, next: NextFunction) => {
  // Record start time
  req.startTime = Date.now();
  
  // Store original json and send methods
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Override res.json to capture response data
  res.json = function(body: any) {
    logResponse(req, res, body);
    return originalJson.call(this, body);
  };
  
  // Override res.send to capture response data
  res.send = function(body: any) {
    logResponse(req, res, body);
    return originalSend.call(this, body);
  };
  
  next();
};

function logResponse(req: LoggedRequest, res: Response, body: any) {
  const duration = req.startTime ? Date.now() - req.startTime : 0;
  const statusCode = res.statusCode;
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';
  
  // Basic request info for all responses
  const requestInfo = {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    ip,
    userAgent: userAgent.substring(0, 100), // Truncate long user agents
  };
  
  // Log non-200 responses with more detail
  if (statusCode < 200 || statusCode >= 300) {
    const errorInfo = {
      ...requestInfo,
      responseBody: typeof body === 'string' ? body : JSON.stringify(body),
      headers: {
        contentType: res.get('Content-Type'),
        contentLength: res.get('Content-Length'),
      }
    };
    
    if (statusCode >= 500) {
      logger.error(`HTTP ${statusCode} Server Error`, errorInfo);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${statusCode} Client Error`, errorInfo);
    } else {
      logger.info(`HTTP ${statusCode} Redirect/Info`, errorInfo);
    }
  } else {
    // Log successful requests at debug level (can be disabled in production)
    logger.debug(`HTTP ${statusCode} Success`, requestInfo);
  }
}

export default responseLogger;