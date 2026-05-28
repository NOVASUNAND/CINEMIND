import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.routes.js';

// 1. Initialize environment variables
dotenv.config();

const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Mount the AI routes
app.use('/api/ai', aiRoutes);

// 4. MongoDB Connection Logic
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cinemind';

mongoose.connect(MONGO_URI)
  .then(() => console.log('🗄️ [NODE]: Connected to MongoDB Database Pipeline!'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1); // Stop the server if DB fails
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ [NODE]: Gateway server live on http://localhost:${PORT}`);
});