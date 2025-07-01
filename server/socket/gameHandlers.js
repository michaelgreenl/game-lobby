import { checkWin, checkDraw } from "../game/tictactoe.js";
import { prisma } from "../db/index.js";

export function registerGameHandlers(io, socket, games, userSockets) {
  const playerId = socket.playerId;

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
    console.log(`Player ${playerId} is creating a new game.`);
    try {
      const dbGame = await prisma.game.create({
        data: {
          state: "waiting_for_player_2",
          player1Id: playerId,
        },
      });

      const gameId = dbGame.id;
      console.log(`New game created with ID: ${gameId}`);

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

      socket.emit("gameCreated", games[gameId]);
      socket.join(gameId);
      updateLobby();
    } catch (error) {
      console.error("Failed to create game:", error);
    }
  });

  socket.on("joinGame", async (gameId) => {
    console.log(`Player ${playerId} is attempting to join game: ${gameId}`);
    const game = games[gameId];
    if (
      !game ||
      game.state !== "waiting_for_player_2" ||
      game.players[0].playerId === playerId
    ) {
      console.log(
        `Player ${playerId} failed to join game ${gameId}. Conditions not met.`,
      );
      return;
    }

    try {
      await prisma.game.update({
        where: { id: gameId },
        data: {
          player2Id: playerId,
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

      console.log(`Player ${playerId} successfully joined game ${gameId}.`);
      socket.join(gameId);
      io.to(gameId).emit("gameStart", game);
      updateLobby();
    } catch (error) {
      console.error("Failed to join game:", error);
    }
  });

  socket.on("makeMove", async ({ gameId, index }) => {
    console.log(
      `Player ${playerId} is making a move in game ${gameId} at index ${index}`,
    );
    const game = games[gameId];
    if (
      !game ||
      game.currentPlayer !== playerId ||
      game.board[index] !== null
    ) {
      console.log(`Invalid move by player ${playerId} in game ${gameId}.`);
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
            winnerId: winner?.playerId,
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
      // Game is not over
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

        // Create a new cache object for the new game
        games[newGameId] = {
          id: newGameId,
          players: [
            {
              ...player2,
              symbol: "X",
              socketIds: userSockets.get(player2.playerId)
                ? new Set(Array.from(userSockets.get(player2.playerId)))
                : new Set(),
            },
            {
              ...player1,
              symbol: "O",
              socketIds: userSockets.get(player1.playerId)
                ? new Set(Array.from(userSockets.get(player1.playerId)))
                : new Set(),
            },
          ],
          board: Array(9).fill(null),
          currentPlayer: player2.playerId,
          state: "in_progress",
          rematchRequestedBy: [],
        };

        // Helper to join all sockets to a room and emit event
        function joinAndNotifyAllSockets(player, newGameId, gameData) {
          const globalSet = userSockets.get(player.playerId);
          if (globalSet && globalSet instanceof Set) {
            for (const sockId of globalSet) {
              const sock = io.sockets.sockets.get(sockId);
              if (sock) {
                for (const room of sock.rooms) {
                  if (room !== sock.id && room !== newGameId) {
                    sock.leave(room);
                  }
                }
                sock.join(newGameId);
                sock.emit("gameStart", gameData);
              }
            }
          }
        }

        joinAndNotifyAllSockets(player1, newGameId, games[newGameId]);
        joinAndNotifyAllSockets(player2, newGameId, games[newGameId]);

        io.to(newGameId).emit("gameStart", games[newGameId]);

        delete games[gameId];
      } catch (error) {
        console.error("Failed to create rematch game:", error);
      }
    } else {
      const opponent = finishedGame.players.find(
        (p) => p.playerId !== playerId,
      );
      const globalSet = userSockets.get(opponent.playerId);
      if (globalSet && globalSet instanceof Set) {
        for (const sockId of globalSet) {
          io.to(sockId).emit("opponentWantsRematch");
        }
      }
    }
  });

  socket.on("fetchGameState", async (gameId) => {
    if (!gameId) {
      return console.warn(`Player ${playerId} sent an empty gameId.`);
    }

    let game = games[gameId];

    if (!game) {
      try {
        const dbGame = await prisma.game.findUnique({
          where: { id: gameId },
          include: { player1: true, player2: true },
        });
        if (
          dbGame &&
          (dbGame.player1Id === playerId || dbGame.player2Id === playerId)
        ) {
          games[gameId] = {
            id: dbGame.id,
            players: [
              { playerId: dbGame.player1.id, symbol: "X", isOnline: false },
              { playerId: dbGame.player2?.id, symbol: "O", isOnline: false },
            ],
            board: Array(9).fill(null),
            currentPlayer: dbGame.player1Id,
            state: dbGame.state,
            rematchRequestedBy: [],
          };
          game = games[gameId];
        }
      } catch (error) {
        console.error("Error fetching game from DB:", error);
        return;
      }
    }

    const playerObj = game.players.find((p) => p.playerId === playerId);
    const globalSet = userSockets.get(playerId);
    if (playerObj && globalSet && globalSet instanceof Set) {
      for (const sockId of globalSet) {
        const sock = io.sockets.sockets.get(sockId);
        if (sock) {
          for (const room of sock.rooms) {
            if (room !== sock.id && room !== gameId) {
              sock.leave(room);
            }
          }
          sock.join(gameId);
          sock.emit("gameReconnected", game);
        }
      }
    } else {
      // Always join the requesting socket to the game room
      socket.join(gameId);
      socket.emit("gameReconnected", game);
    }
  });

  socket.on("checkActiveGame", async () => {
    try {
      // First check in-memory games
      const activeGame = Object.values(games).find(
        (game) =>
          game.players.some((p) => p.playerId === playerId) &&
          !game.state?.includes("game_over") &&
          game.state !== "cancelled",
      );

      if (activeGame) {
        socket.emit("activeGameResponse", activeGame);
        return;
      }

      // If not found in memory, check database
      const dbGame = await prisma.game.findFirst({
        where: {
          OR: [{ player1Id: playerId }, { player2Id: playerId }],
          AND: {
            state: {
              notIn: ["game_over_win", "game_over_draw", "cancelled"],
            },
          },
        },
        include: { player1: true, player2: true },
        orderBy: { createdAt: "desc" },
      });

      if (dbGame) {
        // Rehydrate the game into memory
        const rehydratedGame = {
          id: dbGame.id,
          players: [
            { playerId: dbGame.player1.id, symbol: "X", isOnline: false },
            ...(dbGame.player2
              ? [{ playerId: dbGame.player2.id, symbol: "O", isOnline: false }]
              : []),
          ],
          board: Array(9).fill(null),
          currentPlayer: dbGame.player1Id,
          state: dbGame.state,
          rematchRequestedBy: [],
        };

        games[dbGame.id] = rehydratedGame;
        socket.emit("activeGameResponse", rehydratedGame);
      } else {
        socket.emit("activeGameResponse", null);
      }
    } catch (error) {
      console.error("Error checking for active game:", error);
      socket.emit("activeGameResponse", null);
    }
  });

  socket.on("cancelGame", async (gameId) => {
    console.log(`Player ${playerId} is attempting to cancel game: ${gameId}`);
    const game = games[gameId];

    // Basic validation
    if (!game || game.players[0].playerId !== playerId) {
      console.log(
        `Player ${playerId} failed to cancel game ${gameId}. Conditions not met.`,
      );
      return;
    }

    // More robust validation: only cancel if waiting for player 2
    if (game.state !== "waiting_for_player_2") {
      console.log(
        `Game ${gameId} cannot be cancelled as it's not in a waiting state.`,
      );
      return;
    }

    try {
      // Update the game state in the database to 'cancelled'
      await prisma.game.update({
        where: { id: gameId },
        data: { state: "cancelled" },
      });

      // Notify the creator's client that the game has been successfully cancelled
      io.to(gameId).emit("gameCancelled", gameId);

      // Remove the game from the in-memory cache
      delete games[gameId];

      // Update the lobby for all other clients
      updateLobby();

      console.log(`Game ${gameId} has been cancelled by player ${playerId}.`);
    } catch (error) {
      console.error(`Failed to cancel game ${gameId}:`, error);
      // Optionally, emit an error event back to the client
      socket.emit("cancelGameError", { message: "Error cancelling the game." });
    }
  });

  socket.on("leaveGame", (gameId) => {
    console.log(`Player ${playerId} is leaving game: ${gameId}`);
    const game = games[gameId];

    if (!game) {
      console.log(`Game ${gameId} not found for player ${playerId} to leave.`);
      return;
    }

    // Notify the other player that this player has left
    const opponent = game.players.find((p) => p.playerId !== playerId);
    if (opponent) {
      const opponentSockets = userSockets.get(opponent.playerId);
      if (opponentSockets) {
        for (const socketId of opponentSockets) {
          io.to(socketId).emit("playerDisconnected", { gameId });
        }
      }
    }

    socket.leave(gameId);
  });

  socket.on("forfeitGame", async (gameId) => {
    console.log(`Player ${playerId} is forfeiting game: ${gameId}`);
    const game = games[gameId];

    if (!game || !game.players.some((p) => p.playerId === playerId)) {
      console.log(`Player ${playerId} cannot forfeit game ${gameId} as they are not a player.`);
      return;
    }

    if (game.state !== "in_progress") {
      console.log(`Game ${gameId} cannot be forfeited as it is not in progress.`);
      return;
    }

    const opponent = game.players.find((p) => p.playerId !== playerId);

    try {
      await prisma.game.update({
        where: { id: gameId },
        data: {
          state: "game_over_win",
          winnerId: opponent.playerId,
        },
      });

      game.state = "game_over_win";
      game.winner = opponent.playerId;

      io.to(gameId).emit("gameOver", game);

      setTimeout(() => delete games[gameId], 60000);
    } catch (error) {
      console.error(`Failed to forfeit game ${gameId}:`, error);
    }
  });
}
("");
