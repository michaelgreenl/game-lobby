import { checkWin, checkDraw } from "../game/tictactoe.js";
import { prisma } from "../db.js";

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

  socket.on("createGame", async () => {
    try {
      const user = await prisma.user.upsert({
        where: { id: playerId },
        update: {},
        create: { id: playerId },
      });

      const dbGame = await prisma.game.create({
        data: {
          state: "waiting_for_player_2",
          player1Id: user.id,
        },
      });

      const gameId = dbGame.id;

      games[gameId] = {
        id: gameId,
        players: [
          { playerId, socketId: socket.id, symbol: "X", isOnline: true },
        ],
        board: Array(9).fill(null),
        currentPlayer: playerId,
        state: "waiting_for_player_2",
        rematchRequestedBy: [],
      };

      socket.join(gameId);
      socket.emit("gameCreated", games[gameId]);
      updateLobby();
    } catch (error) {
      console.error("Failed to create game:", error);
    }
  });

  socket.on("joinGame", async (gameId) => {
    const game = games[gameId];
    if (
      !game ||
      game.state !== "waiting_for_player_2" ||
      game.players[0].playerId === playerId
    ) {
      return;
    }

    try {
      const user = await prisma.user.upsert({
        where: { id: playerId },
        update: {},
        create: { id: playerId },
      });

      await prisma.game.update({
        where: { id: gameId },
        data: {
          player2Id: user.id,
          state: "in_progress",
        },
      });

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
    } catch (error) {
      console.error("Failed to join game:", error);
    }
  });

  socket.on("makeMove", async ({ gameId, index }) => {
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

    const winnerSymbol = checkWin(game.board);
    const isDraw = !winnerSymbol && checkDraw(game.board);

    if (winnerSymbol || isDraw) {
      const winner = game.players.find((p) => p.symbol === winnerSymbol);

      try {
        await prisma.game.update({
          where: { id: gameId },
          data: {
            state: winner ? "game_over_win" : "game_over_draw",
            winnerId: winner?.playerId, // Use optional chaining for safety
          },
        });
      } catch (error) {
        console.error("Failed to update final game state:", error);
      }

      game.state = winner ? "game_over_win" : "game_over_draw";
      game.winner = winner?.playerId;
      io.to(gameId).emit("gameOver", game);

      // Schedule the finished game to be removed from the active cache later
      setTimeout(() => delete games[gameId], 60000);
      return;
    } else {
      // --- If game is not over, continue as normal ---
      game.currentPlayer = game.players.find(
        (p) => p.playerId !== playerId,
      ).playerId;
      io.to(gameId).emit("updateBoard", game);
    }
  });

  socket.on("playerReadyForRematch", async ({ gameId }) => {
    const finishedGame = games[gameId];
    if (!finishedGame) return;

    if (!finishedGame.rematchRequestedBy.includes(playerId)) {
      finishedGame.rematchRequestedBy.push(playerId);
    }

    if (finishedGame.rematchRequestedBy.length === 2) {
      try {
        const player1 = finishedGame.players[0];
        const player2 = finishedGame.players[1];

        // Create the new game in the database, swapping the players
        const newDbGame = await prisma.game.create({
          data: {
            state: "in_progress",
            player1Id: player2.playerId,
            player2Id: player1.playerId,
          },
        });
        const newGameId = newDbGame.id;

        // Create a new in-memory cache object for the new game
        games[newGameId] = {
          id: newGameId,
          // Swap the players array and symbols
          players: [
            {
              ...player2,
              symbol: "X",
              socketId: io.sockets.sockets.get(player2.socketId)?.id,
            },
            {
              ...player1,
              symbol: "O",
              socketId: io.sockets.sockets.get(player1.socketId)?.id,
            },
          ],
          board: Array(9).fill(null),
          currentPlayer: player2.playerId,
          state: "in_progress",
          rematchRequestedBy: [],
        };

        // Join both players to the new game room
        io.sockets.sockets.get(player1.socketId)?.join(newGameId);
        io.sockets.sockets.get(player2.socketId)?.join(newGameId);

        io.to(newGameId).emit("gameStart", games[newGameId]);

        delete games[gameId];
      } catch (error) {
        console.error("Failed to create rematch game:", error);
      }
    } else {
      const opponent = finishedGame.players.find(
        (p) => p.playerId !== playerId,
      );
      if (opponent?.socketId) {
        io.to(opponent.socketId).emit("opponentWantsRematch");
      }
    }
  });
}
