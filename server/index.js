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
const disconnectTimeouts = new Map();

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
  const playerId = socket.handshake.auth.playerId;
  console.log(`A user connected: ${playerId} with socket ${socket.id}`);

  let reconnected = false;

  // Find if this playerId is part of any existing game
  for (const gameId in games) {
    const game = games[gameId];
    const playerInGame = game.players.find((p) => p.playerId === playerId);

    // If the player is in a game AND is marked as disconnected
    if (playerInGame && !playerInGame.isOnline) {
      console.log(`Player ${playerId} is reconnecting to game ${gameId}`);
      reconnected = true;

      const timer = disconnectTimeouts.get(playerId);
      if (timer) {
        clearTimeout(timer);
        disconnectTimeouts.delete(playerId);
      }

      playerInGame.isOnline = true;
      playerInGame.socketId = socket.id;
      socket.join(gameId);

      io.to(gameId).emit("gameReconnected", game);
      break;
    }
  }

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

  if (!reconnected) {
    updateLobby();
  }

  // CREATE a new game
  socket.on("createGame", () => {
    const gameId = `game_${Math.random().toString(36).substr(2, 9)}`;
    games[gameId] = {
      id: gameId,
      players: [
        {
          playerId: playerId,
          socketId: socket.id,
          symbol: "X",
          isOnline: true,
        },
      ],
      board: Array(9).fill(null),
      currentPlayer: playerId,
      state: "waiting_for_player_2",
      winner: null,
    };
    socket.join(gameId);
    socket.emit("gameCreated", games[gameId]);
    updateLobby();
  });

  // JOIN an existing game
  socket.on("joinGame", (gameId) => {
    const game = games[gameId];
    // Check if the player is already in the game
    const isPlayer1 = game && game.players[0].playerId === playerId;

    if (game && game.state === "waiting_for_player_2" && !isPlayer1) {
      // Add the second player's info
      game.players.push({
        playerId: playerId,
        socketId: socket.id,
        symbol: "O",
        isOnline: true,
      });
      game.state = "in_progress";
      socket.join(gameId);
      io.to(gameId).emit("gameStart", game);
      updateLobby();
    }
  });

  // HANDLE a player's move
  socket.on("makeMove", ({ gameId, index }) => {
    const game = games[gameId];

    if (
      !game ||
      game.currentPlayer !== playerId ||
      game.board[index] !== null
    ) {
      return;
    }

    // Find the player object to get their symbol
    const player = game.players.find((p) => p.playerId === playerId);
    game.board[index] = player.symbol;

    const winnerSymbol = checkWin(game.board);
    if (winnerSymbol) {
      game.state = "game_over_win";
      game.winner = playerId; // The current player is the winner
      // Broadcast the final game state to show who won
      return io.to(gameId).emit("gameOver", game);
    }

    if (checkDraw(game.board)) {
      game.state = "game_over_draw";
      // Broadcast the final game state
      return io.to(gameId).emit("gameOver", game);
    }

    game.currentPlayer = game.players.find(
      (p) => p.playerId !== playerId,
    ).playerId;
    io.to(gameId).emit("updateBoard", game);
  });

  // ---- Disconnect Handling ----
  socket.on("disconnect", () => {
    console.log(`Player ${playerId} disconnected.`);

    // Find the game this player was in
    let gameToEnd = null;
    for (const gameId in games) {
      const game = games[gameId];
      const player = game.players.find((p) => p.playerId === playerId);

      // We only care about games that are actually in progress
      if (player && game.state === "in_progress") {
        player.isOnline = false;

        // Notify the remaining player
        const opponent = game.players.find((p) => p.playerId !== playerId);
        if (opponent && opponent.socketId) {
          io.to(opponent.socketId).emit("playerDisconnected", {
            message: "Opponent disconnected. Waiting 30s for reconnect...",
          });
        }

        // Set a timer to declare a forfeit
        const timer = setTimeout(() => {
          console.log(`Game ${gameId} ending due to forfeit.`);
          game.state = "game_over_win";
          game.winner = opponent.playerId; // Opponent wins
          io.to(gameId).emit("gameOver", game);
          // Clean up the game
          delete games[gameId];
        }, 30000); // 30 seconds

        disconnectTimeouts.set(playerId, timer);
        gameToEnd = game;
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
