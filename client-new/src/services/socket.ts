import { io, Socket } from "socket.io-client";

// Checks for Vercel's variable, strips /api if present, or falls back to localhost
const BASE_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : "http://localhost:5000";

// Create a typed socket instance
export const socket: Socket = io(BASE_URL, {
  autoConnect: true,
  transports: ["websocket"], // force WebSocket transport
});