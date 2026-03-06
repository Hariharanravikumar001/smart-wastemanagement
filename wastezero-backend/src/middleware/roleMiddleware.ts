import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import User from '../models/User';

export const requireRole = (roles: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user || !req.user.id) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }

            const user = await User.findById(req.user.id);

            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            if (!roles.includes(user.role)) {
                res.status(403).json({ message: `Access denied. Requires one of roles: ${roles.join(', ')}` });
                return;
            }

            // Attach full user object for subsequent middlewares if needed
            req.user.role = user.role;
            next();
        } catch (error) {
            console.error('Role validation error:', error);
            res.status(500).json({ message: 'Server error during role validation' });
        }
    };
};
