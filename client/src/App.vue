<template>
  <div class="app">
    <h1>Tic-Tac-Toe Lobby</h1>
    <div v-if="!game.id">
      <Lobby :games="games" @create="createGame" @join="joinGame" />
    </div>
    <div v-else>
      <GameBoard :game="game" @move="makeMove" @create="createGame" @rematch="playAgain" :playerId="playerId"
        :opponentWantsRematch="opponentWantsRematch" :rematchRequested="rematchRequested"
        :opponentDisconnected="opponentDisconnected" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { socket } from './socket';
import { getPlayerId } from './stores/playerStore.js';
import Lobby from './components/Lobby.vue';
import GameBoard from './components/GameBoard.vue';

const playerId = getPlayerId();
const games = ref([]); // List of open games from server
const game = ref({});  // The current game the player is in
const opponentDisconnected = ref(false);
const rematchRequested = ref(false);
const opponentWantsRematch = ref(false);

onMounted(() => {
  socket.connect();

  socket.on('updateGameList', (gameList) => {
    games.value = gameList;
  });

  socket.on('gameCreated', (gameState) => {
    game.value = gameState;
  });

  socket.on('gameStart', (gameState) => {
    game.value = gameState;
    rematchRequested.value = false;
    opponentWantsRematch.value = false;
  });

  socket.on('updateBoard', (gameState) => {
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
    opponentDisconnected.value = false;
    game.value = gameState;
    rematchRequested.value = false;
    opponentWantsRematch.value = false;
  });

  socket.on('opponentWantsRematch', () => {
    opponentWantsRematch.value = true;
  });
});

const createGame = () => {
  socket.emit('createGame');
};

const joinGame = (gameId) => {
  socket.emit('joinGame', gameId);
};

const makeMove = (index) => {
  socket.emit('makeMove', { gameId: game.value.id, index });
};

const playAgain = (gameId) => {
  rematchRequested.value = true;
  socket.emit('playerReadyForRematch', gameId);
};
</script>
