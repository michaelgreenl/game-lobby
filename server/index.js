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

// --- Socket.IO Authentication Middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
    // Attach the user ID to the socket object for use in handlers
    socket.playerId = decoded.userId;
    next();
  });
});

let games = {};
const disconnectTimeouts = new Map();

io.on("connection", (socket) => {
  handleConnection(io, socket, games, disconnectTimeouts);
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
