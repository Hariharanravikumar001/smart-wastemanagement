import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import * as dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes';
import wasteRequestRoutes from './src/routes/wasteRequestRoutes';

dotenv.config();

const app = express();
const port = process.env['PORT'] || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/waste-requests', wasteRequestRoutes);

// Database connection
const mongoUri = process.env['MONGODB_URI'];
if (!mongoUri) {
  console.error('⚠️ WARNING: MONGODB_URI is not defined in .env file');
} else {
  mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ status, database: 'MongoDB Atlas' });
});

app.listen(port, () => {
  console.log(`Backend Express server listening on http://localhost:${port}`);
});
