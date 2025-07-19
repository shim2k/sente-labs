import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// Admin Auth0 subject IDs - only these users can access admin endpoints
const ADMIN_SUBS = [
  'google-oauth2|108244090406347982325', // Your Auth0 subject ID
];

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth?.sub) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userSub = req.auth.sub;
    
    console.log('Admin check - User sub:', userSub, 'Allowed subs:', ADMIN_SUBS);
    
    if (!ADMIN_SUBS.includes(userSub)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};