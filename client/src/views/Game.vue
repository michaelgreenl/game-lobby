<template>
  <div class="game-view-container" :key="route.params.id">
    <GameBoard v-if="gameStore.game.id" :game="gameStore.game" :playerId="authStore.user?.id"
      :opponentDisconnected="gameStore.opponentDisconnected" :rematchRequested="gameStore.rematchRequested"
      :opponentWantsRematch="gameStore.opponentWantsRematch" :disconnectCountdown="gameStore.disconnectCountdown"
      @rematch="gameStore.playAgain(gameStore.game.id)" @exitToLobby="exitToLobby" @move="makeMove"
      @cancelGame="cancelGame" @createNewGame="createNewGame" @forfeit="forfeit" />
    <div v-else class="loading-game">
      <p>Loading game...</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { socket } from '../socket';
import GameBoard from '../components/GameBoard.vue';

const gameStore = useGameStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

onMounted(() => {
  const gameIdFromUrl = route.params.id;

  // This handles refreshing the page on a game URL
  if (!gameStore.game.id || gameStore.game.id !== gameIdFromUrl) {
    // Our store is out of sync with the URL.
    // Ask the server for the latest game state.
    socket.emit('fetchGameState', gameIdFromUrl);
  }

  // Check if user is actually part of this game
  if (gameStore.game.id && gameStore.game.players) {
    const isUserInGame = gameStore.game.players.some(p => p.playerId === authStore.user?.id);
    if (!isUserInGame) {
      // User is not in this game, check if they have an active game elsewhere
      const hasActiveGame = gameStore.checkForActiveGame();
      if (!hasActiveGame) {
        // No active game found, redirect to lobby
        router.push('/lobby');
      }
    }
  }
});

// Watch for changes to the route param and fetch the new game state
watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    socket.emit('fetchGameState', newId);
  }
});

function exitToLobby() {
  gameStore.exitToLobby();
  router.push('/lobby');
}

function makeMove(index) {
  gameStore.makeMove(index);
}

function cancelGame() {
  gameStore.cancelGame(gameStore.game.id);
}

function createNewGame() {
  gameStore.createGame();
}

function forfeit() {
  gameStore.forfeitGame(gameStore.game.id);
}
</script>

<script>
export default {
  name: "GameView",
}
</script>

<style lang="scss" scoped>
@use 'sass:map';

.game-view-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px); // Adjust based on nav height
  padding: map.get($spacers, 3);
}

.loading-game {
  text-align: center;
  color: $color-text-medium;
  font-size: 1.2rem;
}
</style>
