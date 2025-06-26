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
        socket.on('updateGameList', (gameList) => { games.value = gameList; });

        socket.on('gameCreated', (gameState) => {
          game.value = gameState;
          opponentDisconnected.value = false; // Reset disconnect state for new game
          router.push({ name: 'Game', params: { id: gameState.id } });
        });

        socket.on('gameStart', (gameState) => {
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
          console.log('Opponent disconnected:', data.message);

          // Start a countdown timer if game is in progress
          if (data.gameId && game.value.id === data.gameId && game.value.state === 'in_progress') {
            startDisconnectCountdown();
          }
        });

        socket.on('gameReconnected', (gameState) => {
          opponentDisconnected.value = false;
          game.value = gameState;
          stopDisconnectCountdown();
          console.log('Game reconnected, opponent is back online');
        });

        socket.on('gameOver', (gameState) => {
          game.value = gameState;
          stopDisconnectCountdown();
          // Don't reset opponentDisconnected here - opponent might still be disconnected
          rematchRequested.value = false;
          opponentWantsRematch.value = false;
        });

        socket.on('opponentWantsRematch', () => {
          opponentWantsRematch.value = true;
        });

        socket.on('rematchError', (error) => {
          console.error('Rematch error:', error.message);
          // You could add a toast notification here or handle the error in the UI
          alert(error.message);
        });

        socket.on('gameCancelled', (data) => {
          console.log('Game cancelled:', data.message);
          game.value = {};
          opponentDisconnected.value = false;
          rematchRequested.value = false;
          opponentWantsRematch.value = false;
          alert(data.message);
          router.push('/lobby');
        });

        socket.on('activeGameFound', (data) => {
          console.log('Active game found:', data);
          // Redirect to the active game
          router.push({ name: 'Game', params: { id: data.gameId } });
        });

        socket.on('noActiveGame', () => {
          console.log('No active game found');
          // User can proceed to lobby
        });

        socket.on('gameAccessDenied', (data) => {
          console.log('Game access denied:', data.message);
          // Clear the current game and redirect to lobby
          game.value = {};
          opponentDisconnected.value = false;
          rematchRequested.value = false;
          opponentWantsRematch.value = false;
          alert(data.message);
          router.push('/lobby');
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
      console.log(index);
      console.log('here3');
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
      // TODO: This should be the cancel/back to lobby button (after game is over)
    // make a separate newGame handler/button since this shouldn't be the handler for the newGame button
      game.value = {};
    }

    function checkForActiveGame() {
      // First check if user has an active game in the games list
      const activeGame = games.value.find(g => 
        g.players.some(p => p.playerId === authStore.user?.id)
      );
      
      if (activeGame) {
        // User has an active game, redirect to it
        router.push({ name: 'Game', params: { id: activeGame.id } });
        return true;
      }
      
      // If no active game found locally, check if user is currently in a game
      if (game.value && game.value.id) {
        // User is already in a game, redirect to it
        router.push({ name: 'Game', params: { id: game.value.id } });
        return true;
      }
      
      // Check with server for any active games
      socket.emit('checkActiveGame');
      
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
