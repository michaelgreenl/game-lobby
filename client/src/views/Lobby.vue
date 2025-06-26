<template>
  <div class="lobby">
    <div v-if="isCheckingForActiveGame" class="loading">
      <p>Checking for active games...</p>
    </div>
    <div v-else>
      <button @click="gameStore.createGame">Create New Game</button>
      <h2>Open Games</h2>
      <div v-if="gameStore.games.length > 0">
        <ul>
          <li v-for="g in gameStore.games" :key="g.id">
            Game with {{ g.players.length }} player(s)
            <button @click="gameStore.joinGame(g.id)">Join</button>
          </li>
        </ul>
      </div>
      <p v-else>No open games. Create one!</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, onUnmounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';

const gameStore = useGameStore();
const authStore = useAuthStore();
const isCheckingForActiveGame = ref(true);

function handleNoActiveGameFound() {
  isCheckingForActiveGame.value = false;
}

onMounted(async () => {
  // Check if user has an active game and redirect if they do
  if (authStore.isAuthenticated) {
    const hasActiveGame = gameStore.checkForActiveGame();
    if (!hasActiveGame) {
      // No active game found, show lobby
      isCheckingForActiveGame.value = false;
    }
    // If hasActiveGame is true, the user will be redirected and this component won't render
  } else {
    isCheckingForActiveGame.value = false;
  }

  // Listen for the no active game found event
  window.addEventListener('noActiveGameFound', handleNoActiveGameFound);
});

onUnmounted(() => {
  window.removeEventListener('noActiveGameFound', handleNoActiveGameFound);
});
</script>

<script>
export default {
  name: 'GameLobby'
}
</script>
