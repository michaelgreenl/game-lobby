import { registerGameHandlers } from "./gameHandlers.js";

export function handleDisconnect(io, socket, games, disconnectTimeouts) {
  const { playerId } = socket.handshake.auth;
  console.log(`Player ${playerId} disconnected.`);

  for (const gameId in games) {
    const game = games[gameId];
    const player = game.players.find((p) => p.playerId === playerId);

    if (player) {
      player.isOnline = false;

      // only start a forfeit timer if the game was actually in progress.
      if (game.state === "in_progress") {
        const opponent = game.players.find((p) => p.playerId !== playerId);
        if (opponent?.socketId) {
          io.to(opponent.socketId).emit("playerDisconnected", {
            message: "Opponent disconnected...",
          });
        }

        const timer = setTimeout(() => {
          game.state = "game_over_win";
          game.winner = opponent.playerId;
          io.to(gameId).emit("gameOver", game);
          delete games[gameId];
          disconnectTimeouts.delete(playerId);
        }, 30000);

        disconnectTimeouts.set(playerId, timer);
      }

      break;
    }
  }
}

export function handleConnection(io, socket, games, disconnectTimeouts) {
  const { playerId } = socket.handshake.auth;
  let reconnected = false;

  // --- RECONNECTION LOGIC ---
  for (const gameId in games) {
    const game = games[gameId];
    const playerInGame = game.players.find((p) => p.playerId === playerId);

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

  // --- REGISTER ALL OTHER EVENT HANDLERS ---
  registerGameHandlers(io, socket, games);
  // registerChatHandlers(io, socket, games); // For the future

  // Register the disconnect handler for this specific socket
  socket.on("disconnect", () =>
    handleDisconnect(io, socket, games, disconnectTimeouts),
  );
}
