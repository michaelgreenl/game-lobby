<template>
  <div class="lobby">
    <button @click="$emit('create')">Create New Game</button>
    <h2>Open Games</h2>
    <ul>
      <li v-for="game in props.games" :key="game.id">
        Game with {{ game.players.length }} player(s)
        <button @click="$emit('join', game.id)">Join</button>
      </li>
      <li v-if="games.length === 0">No open games. Create one!</li>
    </ul>
  </div>
</template>

<script setup>
const props = defineProps({
  games: Array
});
defineEmits(['create', 'join']);
</script>

<script>
export default {
  name: 'GameLobby'
}
</script>
