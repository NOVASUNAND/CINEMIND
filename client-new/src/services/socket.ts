
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

// Create a typed socket instance
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket"], // force WebSocket transport
});
