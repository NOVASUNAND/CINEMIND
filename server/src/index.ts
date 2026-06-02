import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.routes.js';
import authRoutes from './routes/auth.routes.js';

// 1. Initialize environment variables
dotenv.config();

// 2. Create Express app with type
const app: Application = express();

// 3. Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// 4. Mount AI routes
app.use('/api/ai', aiRoutes);
app.use('/api/auth', authRoutes);

// 5. MongoDB Connection
const MONGO_URI: string = process.env.MONGO_URI || 'mongodb://localhost:27017/cinemind';

mongoose.connect(MONGO_URI)
  .then(() => console.log('🗄️ [NODE]: Connected to MongoDB!'))
  .catch((err: Error) => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });

// 6. Wrap Express in HTTP server
const httpServer = createServer(app);

// 7. Attach Socket.IO with types
const io: Server = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// 8. Socket.IO connection handling
io.on("connection", (socket: Socket) => {
  console.log(`🔌 [SOCKET]: Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log("🔌 [SOCKET]: Client disconnected");
  });
});

// 9. Start unified server
const PORT: number = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(PORT, () => {
  console.log(`🚀 [NODE]: Server live on http://localhost:${PORT}`);
});

// 10. Export io for controllers
export { io };
