import { registerGameHandlers } from "./gameHandlers.js";
import { prisma } from "../db/index.js";

export function handleDisconnect(io, socket, games, disconnectTimeouts) {
  const playerId = socket.playerId;

  for (const gameId in games) {
    const game = games[gameId];
    const player = game.players.find((p) => p.playerId === playerId);

    if (player) {
      player.isOnline = false;
      player.socketId = null;

      const opponent = game.players.find((p) => p.playerId !== playerId);

      // Handle different game states
      if (game.state === "waiting_for_player_2") {
        // Game hasn't started yet - cancel it immediately
        try {
          prisma.game.update({
            where: { id: gameId },
            data: { state: "cancelled" },
          });
        } catch (error) {
          console.error("Failed to update game state to cancelled:", error);
        }

        // Notify the remaining player
        if (opponent?.socketId) {
          io.to(opponent.socketId).emit("gameCancelled", {
            message:
              "Game cancelled - opponent disconnected before game started",
          });
        }

        // Remove from active games
        delete games[gameId];
      } else if (game.state === "in_progress") {
        // Game is in progress - notify opponent and start timer
        if (opponent?.socketId) {
          io.to(opponent.socketId).emit("playerDisconnected", {
            message:
              "Opponent disconnected. You will win in 30 seconds if they don't reconnect.",
            gameId: gameId,
          });
        }

        // Set timer to end game after 30 seconds
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

            // Notify all players in the game
            io.to(gameId).emit("gameOver", currentGame);

            // Clean up
            delete games[gameId];
            disconnectTimeouts.delete(playerId);
          }
        }, 30000);

        disconnectTimeouts.set(playerId, timer);
      } else if (game.state?.includes("game_over")) {
        // Game is already finished - just mark player as offline
        if (opponent?.socketId) {
          io.to(opponent.socketId).emit("playerDisconnected", {
            message: "Opponent disconnected from finished game",
          });
        }
      }

      break;
    }
  }
}

export function handleConnection(io, socket, games, disconnectTimeouts) {
  const playerId = socket.playerId;
  let reconnected = false;

  // --- RECONNECTION LOGIC ---
  for (const gameId in games) {
    const game = games[gameId];
    const playerInGame = game.players.find((p) => p.playerId === playerId);

    if (playerInGame && !playerInGame.isOnline) {
      reconnected = true;

      // Clear any disconnect timeout
      const timer = disconnectTimeouts.get(playerId);
      if (timer) {
        clearTimeout(timer);
        disconnectTimeouts.delete(playerId);
      }

      playerInGame.isOnline = true;
      playerInGame.socketId = socket.id;
      socket.join(gameId);

      // Notify all players in the game that someone reconnected
      io.to(gameId).emit("gameReconnected", game);
      break;
    }
  }

  // If this is a fresh connection, send the lobby list.
  if (!reconnected) {
    const openGames = Object.values(games).filter(
      (g) => g.state === "waiting_for_player_2",
    );
    socket.emit(
      "updateGameList",
      openGames.map((g) => ({ id: g.id, players: g.players })),
    );
  }

  registerGameHandlers(io, socket, games);

  // Register the disconnect handler for this specific socket
  socket.on("disconnect", () =>
    handleDisconnect(io, socket, games, disconnectTimeouts),
  );
}
