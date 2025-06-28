<template>
  <div class="lobby-container">
    <div v-if="isCheckingForActiveGame" class="loading-state">
      <p>Checking for active games...</p>
    </div>
    <div v-else class="lobby-content">
      <button @click="gameStore.createGame" class="create-game-button">Create New Game</button>
      <h2>Open Games</h2>
      <div v-if="gameStore.games.length > 0" class="game-list">
        <ul>
          <li v-for="g in gameStore.games" :key="g.id" class="game-item">
            <span>Game with {{ g.players.length }} player(s)</span>
            <button @click="gameStore.joinGame(g.id)" class="join-game-button">Join</button>
          </li>
        </ul>
      </div>
      <p v-else class="no-games-message">No open games. Create one!</p>
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

<style lang="scss" scoped>
@use 'sass:map';
@use 'sass:color';

.lobby-container {
  display: flex;
  justify-content: center;
  padding: map.get($spacers, 4);
  min-height: calc(100vh - 80px); // Adjust based on nav height
}

.loading-state {
  text-align: center;
  color: $color-text-medium;
  font-size: 1.2rem;
  margin-top: map.get($spacers, 5);
}

.lobby-content {
  background-color: $color-background-medium;
  padding: map.get($spacers, 5);
  border-radius: $border-radius;
  box-shadow: $box-shadow;
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: map.get($spacers, 4);

  h2 {
    text-align: center;
    color: $color-text-light;
    margin-bottom: map.get($spacers, 3);
  }

  .create-game-button {
    width: 100%;
    padding: map.get($spacers, 3);
    font-size: 1.1rem;
    font-weight: $font-weight-semibold;
    background-color: $color-accent;
    color: $color-text-light;
    border: none;
    border-radius: $border-radius;
    cursor: pointer;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: color.adjust($color-accent, $lightness: 10%);
    }
  }

  .game-list {
    ul {
      display: flex;
      flex-direction: column;
      gap: map.get($spacers, 2);
    }

    .game-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: $color-background-dark;
      padding: map.get($spacers, 3);
      border-radius: $border-radius;
      border: 1px solid $color-border;

      span {
        color: $color-text-light;
      }

      .join-game-button {
        padding: map.get($spacers, 1) map.get($spacers, 3);
        font-size: 0.9rem;
        background-color: $color-success;

        &:hover {
          background-color: color.adjust($color-success, $lightness: 10%);
        }
      }
    }
  }

  .no-games-message {
    text-align: center;
    color: $color-text-medium;
    font-style: italic;
  }
}
</style>
