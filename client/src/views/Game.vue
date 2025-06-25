<template>
  <div class="game-view-container">
    <GameBoard v-if="gameStore.game.id" :game="gameStore.game" :playerId="authStore.user?.id"
      :opponentDisconnected="gameStore.opponentDisconnected" :rematchRequested="gameStore.rematchRequested"
      :opponentWantsRematch="gameStore.opponentWantsRematch" @rematch="gameStore.playAgain(gameStore.game.id)"
      @exitToLobby="exitToLobby" />
    <div v-else>
      <p>Loading game...</p>
    </div>
  </div>
</template>

<script setup>
// TODO: Pass gameStore down as a prop, instead of all the props/emits
import { onMounted } from 'vue';
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
});

function exitToLobby() {
  gameStore.exitToLobby();
  router.push('/lobby');
}
</script>

<script>
export default {
  name: "GameView",
}
</script>
