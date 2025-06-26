import { registerGameHandlers } from "./gameHandlers.js";
import { prisma } from "../db/index.js";

// Global map: userId -> Set of socketIds
export const userSockets = new Map();

export function handleDisconnect(io, socket, games, disconnectTimeouts) {
  const playerId = socket.playerId;

  // Remove this socket from the global userSockets map
  if (userSockets.has(playerId)) {
    const set = userSockets.get(playerId);
    set.delete(socket.id);
    if (set.size === 0) {
      userSockets.delete(playerId);
    }
  }

  for (const gameId in games) {
    const game = games[gameId];
    const player = game.players.find((p) => p.playerId === playerId);

    if (player) {
      // Only mark offline if user has no sockets globally
      if (!userSockets.has(playerId) || userSockets.get(playerId).size === 0) {
        player.isOnline = false;
      }

      const opponent = game.players.find((p) => p.playerId !== playerId);

      // Handle different game states
      if (game.state === "waiting_for_player_2") {
        try {
          prisma.game.update({
            where: { id: gameId },
            data: { state: "cancelled" },
          });
        } catch (error) {
          console.error("Failed to update game state to cancelled:", error);
        }
        if (opponent?.socketIds && opponent.socketIds.size > 0) {
          for (const oppSocketId of opponent.socketIds) {
            io.to(oppSocketId).emit("gameCancelled", {
              message:
                "Game cancelled - opponent disconnected before game started",
            });
          }
        }
        delete games[gameId];
      } else if (game.state === "in_progress") {
        if (!player.isOnline) {
          if (opponent?.socketIds && opponent.socketIds.size > 0) {
            for (const oppSocketId of opponent.socketIds) {
              io.to(oppSocketId).emit("playerDisconnected", {
                message:
                  "Opponent disconnected. You will win in 30 seconds if they don't reconnect.",
                gameId: gameId,
              });
            }
          }
          const timer = setTimeout(async () => {
            const currentGame = games[gameId];
            if (
              currentGame &&
              currentGame.players.find((p) => p.playerId === playerId)
                ?.isOnline === false
            ) {
              try {
                await prisma.game.update({
                  where: { id: gameId },
                  data: {
                    state: "game_over_win",
                    winnerId: opponent.playerId,
                  },
                });
              } catch (error) {
                console.error(
                  "Failed to update game state to game_over_win:",
                  error,
                );
              }
              currentGame.state = "game_over_win";
              currentGame.winner = opponent.playerId;
              io.to(gameId).emit("gameOver", currentGame);
              delete games[gameId];
              disconnectTimeouts.delete(playerId);
            }
          }, 30000);
          disconnectTimeouts.set(playerId, timer);
        }
      } else if (game.state?.includes("game_over")) {
        if (opponent?.socketIds && opponent.socketIds.size > 0) {
          for (const oppSocketId of opponent.socketIds) {
            io.to(oppSocketId).emit("playerDisconnected", {
              message: "Opponent disconnected from finished game",
            });
          }
        }
      }
      break;
    }
  }
}

export function handleConnection(io, socket, games, disconnectTimeouts) {
  const playerId = socket.playerId;
  let reconnected = false;

  // Add this socket to the global userSockets map
  if (!userSockets.has(playerId)) {
    userSockets.set(playerId, new Set());
  }
  userSockets.get(playerId).add(socket.id);

  for (const gameId in games) {
    const game = games[gameId];
    const playerInGame = game.players.find((p) => p.playerId === playerId);

    if (playerInGame) {
      if (!playerInGame.socketIds || !(playerInGame.socketIds instanceof Set)) {
        playerInGame.socketIds = new Set();
      }
      playerInGame.socketIds.add(socket.id);
      if (!playerInGame.isOnline) {
        reconnected = true;
        playerInGame.isOnline = true;
        const timer = disconnectTimeouts.get(playerId);
        if (timer) {
          clearTimeout(timer);
          disconnectTimeouts.delete(playerId);
        }
        socket.join(gameId);
        io.to(gameId).emit("gameReconnected", game);
      } else {
        socket.join(gameId);
      }
    }
  }

  if (!reconnected) {
    const openGames = Object.values(games).filter(
      (g) => g.state === "waiting_for_player_2",
    );
    socket.emit(
      "updateGameList",
      openGames.map((g) => ({ id: g.id, players: g.players })),
    );
  }

  registerGameHandlers(io, socket, games, userSockets);

  socket.on("disconnect", () =>
    handleDisconnect(io, socket, games, disconnectTimeouts),
  );
}
