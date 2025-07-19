import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

interface AuthRequest extends Request {
  auth?: {
    sub: string;
    [key: string]: any;
  };
}

let client: jwksClient.JwksClient;

function getKey(header: any, callback: any) {
  if (!client) {
    if (!process.env.AUTH0_DOMAIN) {
      return callback(new Error('AUTH0_DOMAIN environment variable is required'));
    }
    
    client = jwksClient({
      jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      requestHeaders: {},
      timeout: 30000,
    });
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log(`No token found for request: ${req.url}, method: ${req.method}, headers: ${JSON.stringify(req.headers)}, body: ${JSON.stringify(req.body)}`);
    return res.status(401).json({ error: 'Access token required', code: 'MISSING_TOKEN' });
  }

  // Debug logging
  console.log('Token received:', token.substring(0, 50) + '...');
  console.log('Expected audience:', process.env.AUTH0_AUDIENCE);
  console.log('Expected issuer:', `https://${process.env.AUTH0_DOMAIN}/`);

  jwt.verify(token, getKey, {
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    algorithms: ['RS256']
  }, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err.message);
      return res.status(403).json({ error: 'Invalid token', code: 'INVALID_TOKEN', details: err.message });
    }
    
    req.auth = decoded as any;
    next();
  });
}

export { AuthRequest };