import { checkWin, checkDraw } from "../game/tictactoe.js";

function resetGameForRematch(game) {
  // Swap the starting player
  const player1 = game.players[0];
  const player2 = game.players[1];

  if (game.currentPlayer === player1.playerId) {
    game.currentPlayer = player2.playerId;
  } else {
    game.currentPlayer = player1.playerId;
  }

  // Reset game state
  game.board = Array(9).fill(null);
  game.winner = null;
  game.state = "in_progress";
  game.rematchRequestedBy = [];
}

// This function will be called once per connecting user.
export function registerGameHandlers(io, socket, games) {
  const { playerId } = socket.handshake.auth;

  // Update open games in lobby
  const updateLobby = () => {
    const openGames = Object.values(games).filter(
      (g) => g.state === "waiting_for_player_2",
    );
    io.emit(
      "updateGameList",
      openGames.map((g) => ({ id: g.id, players: g.players })),
    );
  };

  socket.on("createGame", () => {
    const gameId = `game_${Math.random().toString(36).substr(2, 9)}`;
    games[gameId] = {
      id: gameId,
      players: [{ playerId, socketId: socket.id, symbol: "X", isOnline: true }],
      board: Array(9).fill(null),
      currentPlayer: playerId,
      state: "waiting_for_player_2",
      winner: null,
      rematchRequestedBy: [],
    };
    socket.join(gameId);
    socket.emit("gameCreated", games[gameId]);
    updateLobby();
  });

  socket.on("joinGame", (gameId) => {
    const game = games[gameId];
    const isPlayer1 = game && game.players[0].playerId === playerId;

    if (game && game.state === "waiting_for_player_2" && !isPlayer1) {
      game.players.push({
        playerId,
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

  socket.on("makeMove", ({ gameId, index }) => {
    const game = games[gameId];
    if (
      !game ||
      game.currentPlayer !== playerId ||
      game.board[index] !== null
    ) {
      return;
    }

    const player = game.players.find((p) => p.playerId === playerId);
    game.board[index] = player.symbol;

    if (checkWin(game.board)) {
      game.state = "game_over_win";
      game.winner = playerId;
      return io.to(gameId).emit("gameOver", game);
    }

    if (checkDraw(game.board)) {
      game.state = "game_over_draw";
      return io.to(gameId).emit("gameOver", game);
    }

    game.currentPlayer = game.players.find(
      (p) => p.playerId !== playerId,
    ).playerId;
    io.to(gameId).emit("updateBoard", game);
  });

  socket.on("playerReadyForRematch", (gameId) => {
    const game = games[gameId];
    if (!game) return;

    // Register this player's request
    if (!game.rematchRequestedBy.includes(playerId)) {
      game.rematchRequestedBy.push(playerId);
    }

    // Check if both players are now ready
    if (game.rematchRequestedBy.length === 2) {
      // Both player's want rematch
      resetGameForRematch(game);

      io.to(gameId).emit("gameStart", game);
    } else {
      // Only one player is ready. Notify the opponent.
      const opponent = game.players.find((p) => p.playerId !== playerId);
      if (opponent?.socketId) {
        io.to(opponent.socketId).emit("opponentWantsRematch");
      }
    }
  });
}
