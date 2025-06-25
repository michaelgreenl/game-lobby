import { checkWin, checkDraw, resetGameForRematch } from "../game/tictactoe.js";
import { prisma } from "../db/index.js";

// This function will be called once per connecting user.
export function registerGameHandlers(io, socket, games) {
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
    try {
      const dbGame = await prisma.game.create({
        data: {
          state: "waiting_for_player_2",
          player1Id: playerId,
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

      socket.emit("gameCreated", games[gameId]);
      socket.join(gameId);
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

  socket.on("fetchGameState", async (gameId) => {
    if (!gameId) {
      return console.warn(`Player ${playerId} sent an empty gameId.`);
    }

    // Check if the game is already in our fast in-memory cache
    let game = games[gameId];

    // If it's NOT in the cache, try to fetch it from the database
    if (!game) {
      console.log(`Game ${gameId} not in cache. Checking database...`);
      try {
        const dbGame = await prisma.game.findUnique({
          where: { id: gameId },
          include: { player1: true, player2: true }, // Include player data
        });

        // If found in DB, "rehydrate" the in-memory game object
        if (
          dbGame &&
          (dbGame.player1Id === playerId || dbGame.player2Id === playerId)
        ) {
          games[gameId] = {
            id: dbGame.id,
            players: [
              { playerId: dbGame.player1.id, symbol: "X", isOnline: false }, // Assume offline until they reconnect
              { playerId: dbGame.player2?.id, symbol: "O", isOnline: false },
            ],
            board: Array(9).fill(null),
            currentPlayer: dbGame.player1Id,
            state: dbGame.state,
            rematchRequestedBy: [],
          };
          game = games[gameId]; // Assign it to our 'game' variable
          console.log(`Rehydrated game ${gameId} from database.`);
        }
      } catch (error) {
        console.error("Error fetching game from DB:", error);
        return;
      }
    }

    // --- The rest of your logic can now proceed ---

    // Security and Sanity Check: Does the game even exist?
    if (!game) {
      console.warn(`Player ${playerId} requested non-existent game: ${gameId}`);
      return;
    }

    const isPlayerInGame = game.players.some((p) => p.playerId === playerId);
    if (!isPlayerInGame) {
      console.warn(
        `Player ${playerId} attempted to fetch state for a game they are not in: ${gameId}`,
      );
      return;
    }

    console.log(
      `Player ${playerId} successfully fetched state for game ${gameId}`,
    );

    // We send the 'gameReconnected' event to trigger the full client-side update logic
    // This will also handle updating the player's 'isOnline' status via the main connect handler
    socket.emit("gameReconnected", game);
  });
}
