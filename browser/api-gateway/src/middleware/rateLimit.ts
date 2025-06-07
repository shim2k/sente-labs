import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// Create rate limiter
export const createRateLimit = () => {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${windowMs / 1000} seconds.`,
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${windowMs / 1000} seconds.`,
        statusCode: 429
      });
    }
  });
}; 