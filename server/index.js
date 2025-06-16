const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // URL of your Vue app
    methods: ["GET", "POST"],
  },
});

const PORT = 3000;

// In-memory storage for our games.
// In a real app, you'd use a database.
let games = {};

io.on("connection", (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Helper function to broadcast the current list of open games
  const updateLobby = () => {
    const openGames = Object.values(games).filter(
      (g) => g.state === "waiting_for_player_2",
    );
    io.emit(
      "updateGameList",
      openGames.map((g) => ({ id: g.id, players: g.players })),
    );
  };

  // Initial lobby update for the new user
  updateLobby();

  // CREATE a new game
  socket.on("createGame", () => {
    const gameId = `game_${Math.random().toString(36).substr(2, 9)}`;
    games[gameId] = {
      id: gameId,
      players: [socket.id],
      board: Array(9).fill(null), // Simpler 1D array for the board
      currentPlayer: socket.id,
      state: "waiting_for_player_2",
      winner: null,
    };
    socket.join(gameId); // Player joins a "room" for this game
    console.log(`Game created by ${socket.id} with ID ${gameId}`);
    updateLobby(); // Inform everyone about the new game
  });

  // JOIN an existing game
  socket.on("joinGame", (gameId) => {
    const game = games[gameId];
    if (game && game.state === "waiting_for_player_2") {
      game.players.push(socket.id);
      game.state = "in_progress";
      socket.join(gameId);

      console.log(`Player ${socket.id} joined game ${gameId}`);

      // Broadcast the updated game state to both players in the room
      io.to(gameId).emit("gameStart", game);

      // Remove the game from the public lobby list
      updateLobby();
    }
  });

  // HANDLE a player's move
  socket.on("makeMove", ({ gameId, index }) => {
    const game = games[gameId];

    // Validation: Is it the player's turn? Is the move valid?
    if (
      !game ||
      game.currentPlayer !== socket.id ||
      game.board[index] !== null
    ) {
      // Optionally, send an 'invalidMove' event back to the player
      return;
    }

    // Update board state
    const symbol = game.players[0] === socket.id ? "X" : "O";
    game.board[index] = symbol;

    // Check for win/draw
    // (You would implement checkWin and checkDraw functions here)
    // const winner = checkWin(game.board);
    // const draw = checkDraw(game.board);

    // if (winner) { ... } else if (draw) { ... }

    // Switch turns
    game.currentPlayer = game.players.find((p) => p !== socket.id);

    // Broadcast the updated state to everyone in the game room
    io.to(gameId).emit("updateBoard", game);
  });

  // ---- Disconnect Handling ----
  socket.on("disconnect", () => {
    console.log(`A user disconnected: ${socket.id}`);
    // TODO: Handle user disconnection during a game
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
