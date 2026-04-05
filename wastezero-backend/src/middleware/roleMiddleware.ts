import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import User from '../models/User';

export const requireRole = (roles: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'User not authenticated' });
                return;
            }

            // Trust the role from the token if it matches what we need
            let userRole = req.user.role ? req.user.role.toLowerCase() : '';
            
            // If role not in token, fetch from DB
            if (!userRole) {
                const user = await User.findById(req.user.id);
                if (user) {
                    userRole = user.role.toLowerCase();
                    req.user.role = user.role; // Update token role for next middleware
                }
            }

            const allowedRoles = roles.map(r => r.toLowerCase());

            if (!userRole || !allowedRoles.includes(userRole)) {
                res.status(403).json({ 
                    message: `Access denied. Role: ${userRole || 'none'}. Requires: ${roles.join(', ')}` 
                });
                return;
            }

            next();
        } catch (error) {
            console.error('Role validation error:', error);
            res.status(500).json({ message: 'Server error during role validation' });
        }
    };
};
