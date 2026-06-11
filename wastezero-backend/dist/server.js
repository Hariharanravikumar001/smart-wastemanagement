"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Custom mongo sanitize middleware to support Express 5 where req.query is read-only
const mongoSanitize = () => {
    const sanitize = (obj) => {
        if (obj && typeof obj === 'object') {
            for (const key in obj) {
                if (key.startsWith('$') || key.includes('.')) {
                    delete obj[key];
                }
                else if (typeof obj[key] === 'object') {
                    sanitize(obj[key]);
                }
            }
        }
        return obj;
    };
    return (req, res, next) => {
        if (req.body)
            sanitize(req.body);
        if (req.params)
            sanitize(req.params);
        if (req.headers)
            sanitize(req.headers);
        if (req.query)
            sanitize(req.query);
        next();
    };
};
dotenv.config();
const authRoutes_1 = __importDefault(require("./src/routes/authRoutes"));
const wasteRequestRoutes_1 = __importDefault(require("./src/routes/wasteRequestRoutes"));
const opportunityRoutes_1 = __importDefault(require("./src/routes/opportunityRoutes"));
const applicationRoutes_1 = __importDefault(require("./src/routes/applicationRoutes"));
const messageRoutes_1 = __importDefault(require("./src/routes/messageRoutes"));
const notificationRoutes_1 = __importDefault(require("./src/routes/notificationRoutes"));
const adminRoutes_1 = __importDefault(require("./src/routes/adminRoutes"));
const publicRoutes_1 = __importDefault(require("./src/routes/publicRoutes"));
const feedbackRoutes_1 = __importDefault(require("./src/routes/feedbackRoutes"));
const couponRoutes_1 = __importDefault(require("./src/routes/couponRoutes"));
const http_1 = require("http");
const socketService_1 = require("./src/services/socketService");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const port = process.env['PORT'] || 4000;
// Initialize Socket.io
(0, socketService_1.initSocket)(httpServer);
// Middleware
const allowedOrigins = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'https://smart-wastemanagement-ten.vercel.app'
];
if (process.env['ALLOWED_ORIGINS']) {
    const envOrigins = process.env['ALLOWED_ORIGINS'].split(',').map(o => o.trim());
    allowedOrigins.push(...envOrigins);
}
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin)
            return callback(null, true);
        // Check if origin matches allowed origins or is a vercel.app subdomain
        const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.warn(`⚠️ Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Rate limiting configuration
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10000, // Increased limit for local development/testing to avoid 429 errors
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
}));
app.use(mongoSanitize());
app.use('/api', limiter);
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLine = `${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms\n`;
        console.log(logLine.trim());
        try {
            require('fs').appendFileSync('live_requests.log', logLine);
        }
        catch (e) { }
        if (duration > 1000) {
            console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.url} took ${duration}ms`);
        }
    });
    next();
});
app.use((req, res, next) => {
    if (req.url.includes('/api/login')) {
        console.log(`[DIAGNOSTIC] Incoming login request: ${req.method} ${req.url}`);
        console.log(`[DIAGNOSTIC] Headers:`, req.headers);
    }
    next();
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// Routes
app.use('/api', authRoutes_1.default);
app.use('/api/waste-requests', wasteRequestRoutes_1.default);
app.use('/api/opportunities', opportunityRoutes_1.default);
app.use('/api/applications', applicationRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/public', publicRoutes_1.default);
app.use('/api/feedback', feedbackRoutes_1.default);
app.use('/api/coupons', couponRoutes_1.default);
const aiRoutes_1 = __importDefault(require("./src/routes/aiRoutes"));
app.use('/api/ai', aiRoutes_1.default);
const routeOptimizationRoutes_1 = __importDefault(require("./src/routes/routeOptimizationRoutes"));
app.use('/api/routes', routeOptimizationRoutes_1.default);
// Database connection
let lastMongoError = null;
const mongoUri = process.env['MONGODB_URI'];
let mongoUriDefined = !!mongoUri;
if (!mongoUri) {
    console.error('⚠️ WARNING: MONGODB_URI is not defined in .env file');
}
else {
    // Mask URI for logging
    const maskedUri = mongoUri.replace(/\/\/.*@/, '//****:****@');
    console.log(`⏳ [DEBUG] Connecting to MongoDB at ${maskedUri}...`);
    // Disable command buffering so queries fail fast if connection is down
    mongoose_1.default.set('bufferCommands', false);
    mongoose_1.default.connect(mongoUri)
        .then(async () => {
        console.log('✅ Connected to MongoDB Atlas');
        // Diagnostic counts
        try {
            const UserCount = await mongoose_1.default.model('User').countDocuments();
            const OppCount = await mongoose_1.default.model('Opportunity').countDocuments();
            const AppCount = await mongoose_1.default.model('Application').countDocuments();
            console.log(`📊 DB Counts - Users: ${UserCount}, Opportunities: ${OppCount}, Applications: ${AppCount}`);
        }
        catch (countErr) {
            console.warn('⚠️ Could not fetch initial counts:', countErr.message);
        }
    })
        .catch(err => {
        lastMongoError = err;
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('🔍 Error Details:', err); // Log full error object for diagnostics
        if (err.message.includes('querySrv ESERVFAIL') || err.message.includes('ECONNREFUSED') || err.message.includes('selection timed out') || err.message.includes('IP not whitelisted')) {
            console.error('👉 TIP: This error often happens on restrictive networks or if your IP is not whitelisted in MongoDB Atlas.');
        }
    });
}
// Health check endpoint
app.get('/api/health', (req, res) => {
    const readyState = mongoose_1.default.connection.readyState;
    const statusMap = {
        0: 'Disconnected',
        1: 'Connected',
        2: 'Connecting',
        3: 'Disconnecting'
    };
    res.json({
        status: statusMap[readyState] || 'Unknown',
        readyState,
        database: 'MongoDB Atlas',
        mongoUriDefined,
        lastMongoError: lastMongoError ? {
            message: lastMongoError.message,
            name: lastMongoError.name,
            code: lastMongoError.code
        } : null
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('❌ UNHANDLED ERROR:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: err.message,
        stack: err.stack
    });
});
httpServer.listen(Number(port), '0.0.0.0', () => {
    console.log(`Backend Express server listening on http://0.0.0.0:${port}`);
    console.log(`Accessible at http://localhost:${port} or http://127.0.0.1:${port}`);
});
// Global Error Handling to prevent process crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    // Optional: Send to error tracking service
});
process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    // Keep the server running if possible, but log it
});
