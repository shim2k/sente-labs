import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, JWTPayload, ApiError } from '../types';
import { logger } from '../utils/logger';

// Load environment variables
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || '';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || '';

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  logger.error('Missing required environment variables for Auth0 configuration');
  process.exit(1);
}

// Create middleware for checking the JWT
export const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

// Auth middleware that uses checkJwt and adds user info to request
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Use express-jwt middleware
  checkJwt(req, res, (err) => {
    if (err) {
      logger.error('Authentication failed', { error: err.message });
      
      const apiError: ApiError = {
        message: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
        statusCode: 401
      };
      
      res.status(401).json(apiError);
      return;
    }
    
    // Extract user info from the JWT payload (added by express-jwt)
    const auth = (req as any).auth;
    if (auth) {
      req.user = {
        sub: auth.sub,
        email: auth.email
      };
      
      logger.debug('User authenticated', { userId: auth.sub });
    }
    
    next();
  });
}

// For WebSocket token validation, we need a function that can validate tokens directly
export async function validateToken(token: string): Promise<JWTPayload | null> {
  try {
    // Create a mock request/response for express-jwt
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as any;
    
    const mockRes = {} as any;
    
    return new Promise((resolve) => {
      checkJwt(mockReq, mockRes, (err) => {
        if (err) {
          logger.error('Token validation failed', { error: err.message });
          resolve(null);
        } else {
          const auth = mockReq.auth;
          resolve(auth ? {
            sub: auth.sub,
            email: auth.email,
            aud: auth.aud,
            iss: auth.iss,
            exp: auth.exp,
            iat: auth.iat
          } : null);
        }
      });
    });
  } catch (error) {
    logger.error('Token validation error', { error });
    return null;
  }
} 