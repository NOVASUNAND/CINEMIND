import { io, Socket } from "socket.io-client";

// 🚀 Use the Vite DEV flag to guarantee local traffic stays local!
const SOCKET_URL = import.meta.env.DEV 
  ? "http://localhost:5000" 
  : (import.meta.env.VITE_API_URL || "").replace('/api', '');

// Create a typed socket instance
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket"], // Skipping long-polling for raw speed ⚡
});