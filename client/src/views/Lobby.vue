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
import { useGameStore } from '../stores/gameStore';
const gameStore = useGameStore();
</script>

<script>
export default {
  name: 'GameLobby'
}
</script>
