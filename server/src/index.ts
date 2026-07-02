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

// Whitelist origins allowed to communicate with this backend
const allowedOrigins = [
  "http://localhost:5173",
  "https://cinemind-76iw.vercel.app" 
];

// 3. Middleware Configuration
app.use(cors({ 
  origin: allowedOrigins, 
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

// 🚨 CHANGE THE '*' TO '/*splat' TO FIX THE EXPRESS 5 CRASH!
app.options('/*splat', cors({ 
  origin: allowedOrigins, 
  credentials: true 
}));

app.use(express.json());

// 4. Mount AI routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);


// 5. MongoDB Connection
const MONGO_URI: string = process.env.MONGO_URI || 'mongodb://localhost:27017/cinemind';

mongoose.connect(MONGO_URI)
  .then(() => console.log('🗄️ [NODE]: Connected to MongoDB!'))
  .catch((err: Error) => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });

  app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("🚨 [CRITICAL RUNTIME ERROR]:", err.message);
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message });
});

// 6. Wrap Express in HTTP server
const httpServer = createServer(app);

// 7. Attach Socket.IO with dynamic multi-origin configurations
const io: Server = new Server(httpServer, {
  cors: { 
    origin: allowedOrigins, 
    methods: ["GET", "POST"],
    credentials: true
  }
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
  console.log(`🚀 [NODE]: Server live on port ${PORT}`);
});

// 10. Export io for controllers
export { io };