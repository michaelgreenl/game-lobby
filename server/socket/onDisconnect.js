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
