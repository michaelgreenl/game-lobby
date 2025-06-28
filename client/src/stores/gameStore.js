import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socket } from '../socket';
import router from '../router';
import { useAuthStore } from './authStore';

export const useGameStore = defineStore('game', () => {
    const games = ref([]); // List of open games from server
    const game = ref({});  // The current game the player is in
    const opponentDisconnected = ref(false);
    const rematchRequested = ref(false);
    const opponentWantsRematch = ref(false);
    const disconnectCountdown = ref(30); // Countdown timer
    let countdownInterval = null;
    const authStore = useAuthStore();

    function initializeSocketListeners() {
        // Remove previous listeners to avoid duplicate handlers
        socket.off('gameStart');

        socket.on('updateGameList', (gameList) => { games.value = gameList; });

        socket.on('gameCreated', (gameState) => {
          game.value = gameState;
          opponentDisconnected.value = false; // Reset disconnect state for new game
          router.push({ name: 'Game', params: { id: gameState.id } });
        });

        socket.on('gameStart', (gameState) => {
          console.log('[Socket] Received gameStart event:', gameState);
          game.value = gameState;
          rematchRequested.value = false;
          opponentWantsRematch.value = false;
          opponentDisconnected.value = false; // Reset disconnect state for new game
          router.push({ name: 'Game', params: { id: gameState.id } });
        });

        socket.on('updateBoard', (gameState) => {
          game.value = gameState;
        });

        socket.on('playerDisconnected', (data) => {
          opponentDisconnected.value = true;

          // Start a countdown timer if game is in progress
          if (data.gameId && game.value.id === data.gameId && game.value.state === 'in_progress') {
            startDisconnectCountdown();
          }
        });

        socket.on('gameReconnected', (gameState) => {
          opponentDisconnected.value = false;
          game.value = gameState;
          stopDisconnectCountdown();
        });

        socket.on('gameOver', (gameState) => {
          game.value = gameState;
          stopDisconnectCountdown();
          rematchRequested.value = false;
          opponentWantsRematch.value = false;
        });

        socket.on('opponentWantsRematch', () => {
          opponentWantsRematch.value = true;
        });

        socket.on('gameCancelled', (cancelledGameId) => {
          // Remove the cancelled game from the local list
          games.value = games.value.filter(g => g.id !== cancelledGameId);

          game.value = {};
          opponentDisconnected.value = false;
          rematchRequested.value = false;
          opponentWantsRematch.value = false;
          router.push('/lobby');
        });

        socket.on('activeGameResponse', (gameState) => {
          if (gameState && gameState.id) {
            game.value = gameState;
            router.push({ name: 'Game', params: { id: gameState.id } });
          } else {
            // No active game found, let the lobby know it's safe to show
            window.dispatchEvent(new CustomEvent('noActiveGameFound'));
          }
        });
    }

    function createGame() {
      socket.emit('createGame');
    }

    function joinGame(gameId) {
      socket.emit('joinGame', gameId);
    }

    function cancelGame(gameId) {
      socket.emit('cancelGame', gameId);
    }

    function makeMove(index) {
      socket.emit('makeMove', { gameId: game.value.id, index });
    }

    function playAgain(gameId) {
      if (opponentDisconnected.value) {
        alert("Cannot request rematch - opponent is disconnected");
        return;
      }
      rematchRequested.value = true;
      socket.emit('playerReadyForRematch', { gameId });
    }

    function exitToLobby() {
      game.value = {};
    }

    function checkForActiveGame() {
      // First check if user has an active game in the games list
      const activeGame = games.value.find(g =>
        g.players.some(p => p.playerId === authStore.user?.id)
      );

      if (activeGame) {
        // User has an active game, redirect to it immediately
        router.push({ name: 'Game', params: { id: activeGame.id } });
        return true;
      }

      // If no active game found locally, check if user is currently in a game
      if (game.value && game.value.id) {
        // User is already in a game, redirect to it immediately
        router.push({ name: 'Game', params: { id: game.value.id } });
        return true;
      }

      // Check with server for any active games
      socket.emit('checkActiveGame');

      // Set a timeout to handle cases where server doesn't respond
      setTimeout(() => {
        // If we still don't have a game after 3 seconds, assume no active game
        if (!game.value || !game.value.id) {
          // Emit an event to let the lobby know it's safe to show
          window.dispatchEvent(new CustomEvent('noActiveGameFound'));
        }
      }, 3000);

      return false;
    }

    function startDisconnectCountdown() {
      disconnectCountdown.value = 30;
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }

      countdownInterval = setInterval(() => {
        disconnectCountdown.value--;
        if (disconnectCountdown.value <= 0) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
      }, 1000);
    }

    function stopDisconnectCountdown() {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      disconnectCountdown.value = 30;
    }

    return {
        games, game, opponentDisconnected, rematchRequested, opponentWantsRematch, disconnectCountdown,
        initializeSocketListeners, createGame, joinGame, cancelGame, makeMove, playAgain, exitToLobby, checkForActiveGame
    };
});
