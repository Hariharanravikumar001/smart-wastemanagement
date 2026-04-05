import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes';
import wasteRequestRoutes from './src/routes/wasteRequestRoutes';
import opportunityRoutes from './src/routes/opportunityRoutes';
import applicationRoutes from './src/routes/applicationRoutes';
import messageRoutes from './src/routes/messageRoutes';
import notificationRoutes from './src/routes/notificationRoutes';
import adminRoutes from './src/routes/adminRoutes';
import publicRoutes from './src/routes/publicRoutes';


import { createServer } from 'http';
import { initSocket } from './src/services/socketService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env['PORT'] || 4000;

// Initialize Socket.io
initSocket(httpServer);

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    if (duration > 1000) {
      console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.url} took ${duration}ms`);
    }
  });
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api', authRoutes);
app.use('/api/waste-requests', wasteRequestRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Database connection
const mongoUri = process.env['MONGODB_URI'];
if (!mongoUri) {
  console.error('⚠️ WARNING: MONGODB_URI is not defined in .env file');
} else {
  // Mask URI for logging
  const maskedUri = mongoUri.replace(/\/\/.*@/, '//****:****@');
  console.log(`⏳ [DEBUG] Connecting to MongoDB at ${maskedUri}...`);
  
  // Disable command buffering so queries fail fast if connection is down
  mongoose.set('bufferCommands', false);

  mongoose.connect(mongoUri)
    .then(async () => {
      console.log('✅ Connected to MongoDB Atlas');
      // Diagnostic counts
      try {
        const UserCount = await mongoose.model('User').countDocuments();
        const OppCount = await mongoose.model('Opportunity').countDocuments();
        const AppCount = await mongoose.model('Application').countDocuments();
        console.log(`📊 DB Counts - Users: ${UserCount}, Opportunities: ${OppCount}, Applications: ${AppCount}`);
      } catch (countErr) {
        console.warn('⚠️ Could not fetch initial counts:', (countErr as any).message);
      }
    })
    .catch(err => {
      console.error('❌ MongoDB Connection Error:', err.message);
      console.error('🔍 Error Details:', err); // Log full error object for diagnostics
      if (err.message.includes('querySrv ESERVFAIL') || err.message.includes('ECONNREFUSED') || err.message.includes('selection timed out') || err.message.includes('IP not whitelisted')) {
        console.error('👉 TIP: This error often happens on restrictive networks or if your IP is not whitelisted in MongoDB Atlas.');
      }
    });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const readyState = mongoose.connection.readyState;
  const statusMap: { [key: number]: string } = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  
  res.json({ 
    status: statusMap[readyState] || 'Unknown', 
    readyState,
    database: 'MongoDB Atlas' 
  });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
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
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: Send to error tracking service
});

process.on('uncaughtException', (error: Error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  // Keep the server running if possible, but log it
});
