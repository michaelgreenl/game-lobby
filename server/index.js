import express from "express";
import http from "http";
import { Server } from "socket.io";
import { handleConnection } from "./socket/onConnect.js";

// --- Server Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const PORT = 3000;

let games = {};
const disconnectTimeouts = new Map();

io.on("connection", (socket) => {
  handleConnection(io, socket, games, disconnectTimeouts);
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
