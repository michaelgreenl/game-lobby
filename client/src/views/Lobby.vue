<template>
  <div class="lobby">
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
</template>

<script setup>
import { onMounted } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';

const gameStore = useGameStore();
const authStore = useAuthStore();

onMounted(() => {
  // Check if user has an active game and redirect if they do
  if (authStore.isAuthenticated) {
    gameStore.checkForActiveGame();
  }
});
</script>

<script>
export default {
  name: 'GameLobby'
}
</script>
