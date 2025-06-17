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

const checkWin = (board) => {
  const WINNING_COMBINATIONS = [
    // Rows
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    // Columns
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    // Diagonals
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const combination of WINNING_COMBINATIONS) {
    const [a, b, c] = combination;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Returns 'X' or 'O'
    }
  }

  return null;
};

const checkDraw = (board) => {
  // A draw occurs if every square is filled and there is no winner.
  // The win is checked first, so we just need to see if the board is full.
  return board.every((cell) => cell !== null);
};

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
      board: Array(9).fill(null),
      currentPlayer: socket.id,
      state: "waiting_for_player_2",
      winner: null,
    };
    socket.join(gameId); // Player joins a "room" for this game
    console.log(`Game created by ${socket.id} with ID ${gameId}`);

    socket.emit("gameCreated", games[gameId]);

    updateLobby(); // Inform everyone about the new game
  });

  // JOIN an existing game
  socket.on("joinGame", (gameId) => {
    const game = games[gameId];
    if (
      game &&
      game.state === "waiting_for_player_2" &&
      game.players[0] !== socket.id
    ) {
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

    const winnerSymbol = checkWin(game.board);
    if (winnerSymbol) {
      game.state = "game_over_win";
      game.winner = socket.id; // The current player is the winner
      // Broadcast the final game state to show who won
      return io.to(gameId).emit("gameOver", game);
    }

    if (checkDraw(game.board)) {
      game.state = "game_over_draw";
      // Broadcast the final game state
      return io.to(gameId).emit("gameOver", game);
    }

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
