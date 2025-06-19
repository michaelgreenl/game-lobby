import { checkWin, checkDraw } from "../game/tictactoe.js";

// This function will be called once per connecting user.
// We pass in all the state it needs to operate.
export function registerGameHandlers(io, socket, games) {
  const { playerId } = socket.handshake.auth;

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
}
