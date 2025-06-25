import { defineStore } from 'pinia';
import { ref } from 'vue';
import { socket } from '../socket';
import router from '../router';

export const useGameStore = defineStore('game', () => {
    const games = ref([]); // List of open games from server
    const game = ref({});  // The current game the player is in
    const opponentDisconnected = ref(false);
    const rematchRequested = ref(false);
    const opponentWantsRematch = ref(false);

    function initializeSocketListeners() {
        socket.on('updateGameList', (gameList) => { games.value = gameList; });

        socket.on('gameCreated', (gameState) => {
          game.value = gameState;
          router.push({ name: 'Game', params: { id: gameState.id } });
        });

        socket.on('gameStart', (gameState) => {
          game.value = gameState;
          rematchRequested.value = false;
          opponentWantsRematch.value = false;
          router.push({ name: 'Game', params: { id: gameState.id } });
        });

        socket.on('updateBoard', (gameState) => {
          console.log('here')
          game.value = gameState;
        });

        socket.on('playerDisconnected', () => {
          opponentDisconnected.value = true;
        });

        socket.on('gameReconnected', (gameState) => {
          opponentDisconnected.value = false;
          game.value = gameState;
        });

        socket.on('gameOver', (gameState) => {
          game.value = gameState;
          opponentDisconnected.value = false;
          rematchRequested.value = false;
          opponentWantsRematch.value = false;
        });

        socket.on('opponentWantsRematch', () => {
          opponentWantsRematch.value = true;
        });
    }

    function createGame() {
      socket.emit('createGame');
    }

    function joinGame(gameId) {
      socket.emit('joinGame', gameId);
    }

    function makeMove(index) {
      socket.emit('makeMove', { gameId: game.value.id, index });
    }

    function playAgain(gameId) {
        rematchRequested.value = true;
        socket.emit('playerReadyForRematch', { gameId });
    }

    function exitToLobby() {
      game.value = {};
    }

    return {
        games, game, opponentDisconnected, rematchRequested, opponentWantsRematch,
        initializeSocketListeners, createGame, joinGame, makeMove, playAgain, exitToLobby
    };
});
