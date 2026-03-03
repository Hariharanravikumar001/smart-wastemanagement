import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authProtect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Get token from header
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

  // Check if not token
  if (!token) {
    res.status(401).json({ message: 'No token, authorization denied' });
    return;
  }

  // Verify token
  try {
    const secret = process.env['JWT_SECRET'] || 'wastezero_secret_token';
    const decoded = jwt.verify(token, secret);
    
    req.user = (decoded as any).user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
