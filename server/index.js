import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import router from "./routes/index.js";
import { handleConnection } from "./socket/connectionHandlers.js";
import { prisma } from "./db/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";

const PORT = process.env.PORT ? process.env.PORT : 3000;

// --- Server Setup ---
const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(router);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  console.log("Attempting to authenticate socket connection...");
  const token = socket.handshake.auth.token;
  if (!token) {
    console.error("Authentication error: No token provided.");
    return next(new Error("Authentication error: No token provided"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("Authentication error: Invalid token.");
      return next(new Error("Authentication error: Invalid token"));
    }

    // Attach the user ID to the socket object for use in handlers
    console.log(`Socket authenticated for user ID: ${decoded.userId}`);
    socket.playerId = decoded.userId;
    next();
  });
});

let games = {};
const disconnectTimeouts = new Map();

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);
  handleConnection(io, socket, games, disconnectTimeouts);
});

let httpServerInstance = null;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    httpServerInstance = server.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
      resolve(httpServerInstance);
    });
  });
}

export function stopServer() {
  return new Promise((resolve, reject) => {
    if (httpServerInstance) {
      httpServerInstance.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
