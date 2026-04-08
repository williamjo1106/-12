import { io } from "socket.io-client";

// In development, the socket server is on the same host/port as the client
export const socket = io();
