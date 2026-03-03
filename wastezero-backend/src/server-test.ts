import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);

const port = 4001;
const mongoUri = process.env['MONGODB_URI'];

if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error(err));
} else {
  console.log('No MONGODB_URI in ENV!');
}

app.listen(port, () => {
   console.log(`Backend Auth Server Test running on http://localhost:${port}`);
});
