import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  role: string;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authProtect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  let token = req.header('x-auth-token');
  const authHeader = req.header('Authorization');
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

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
  } catch (err: any) {
    console.error('JWT Verification Error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
