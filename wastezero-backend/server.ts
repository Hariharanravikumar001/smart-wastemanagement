import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes';
import wasteRequestRoutes from './src/routes/wasteRequestRoutes';
import opportunityRoutes from './src/routes/opportunityRoutes';
import applicationRoutes from './src/routes/applicationRoutes';

dotenv.config();

const app = express();
const port = process.env['PORT'] || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/waste-requests', wasteRequestRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/applications', applicationRoutes);

// Database connection
const mongoUri = process.env['MONGODB_URI'];
if (!mongoUri) {
  console.error('⚠️ WARNING: MONGODB_URI is not defined in .env file');
} else {
  console.log('⏳ Connecting to MongoDB...');
  
  // Disable command buffering so queries fail fast if connection is down
  mongoose.set('bufferCommands', false);

  mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  })
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => {
      console.error('❌ MongoDB Connection Error:', err.message);
      if (err.message.includes('querySrv ESERVFAIL') || err.message.includes('ECONNREFUSED') || err.message.includes('selection timed out')) {
        console.error('👉 TIP: This error often happens on restrictive networks or if your IP is not whitelisted in MongoDB Atlas.');
      }
    });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ status, database: 'MongoDB Atlas' });
});

app.listen(port, () => {
  console.log(`Backend Express server listening on http://localhost:${port}`);
});
