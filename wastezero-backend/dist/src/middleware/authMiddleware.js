"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authProtect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authProtect = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded.user;
        next();
    }
    catch (err) {
        console.error('JWT Verification Error:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
exports.authProtect = authProtect;
