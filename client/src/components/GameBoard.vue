<template>
  <div class="game-board-container">
    <div v-if="props.game.state === 'waiting_for_player_2'" class="inactive-game">
      <p>Waiting for another player to join...</p>
    </div>

    <div v-else-if="props.game.state === 'in_progress'" class="active-game">
      <h2>Game in Progress</h2>
      <p>Your symbol: {{ mySymbol }}</p>
      <p v-if="isMyTurn">It's your turn!</p>
      <p v-else>Waiting for opponent...</p>
    </div>

    <div v-else-if="props.game.state?.includes('game_over')">
      <h2>Game Over!</h2>
      <p v-if="props.game.state === 'game_over_win'">
        Winner is: {{ props.game.winner === props.playerId ? 'You!:)' : 'Opponent:`(' }}
      </p>
      <p v-if="props.game.state === 'game_over_draw'">It's a draw!</p>
      <p v-if="props.rematchRequested">Waiting for opponent...</p>
      <p v-if="props.opponentWantsRematch">Opponent wants a rematch!</p>
      <p v-if="props.opponentDisconnected">Opponent is disconnected</p>
      <button @click="emit('exitToLobby')">New Game</button>
      <button :class="{ disabled: props.opponentDisconnected }" @click="emit('rematch')">Rematch</button>
    </div>

    <TicTacToe :game="props.game" :isMyTurn="isMyTurn" :opponentDisconnected="props.opponentDisconnected" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import TicTacToe from '../components/TicTacToe.vue';

const props = defineProps({
  game: Object,
  playerId: String,
  opponentDisconnected: Boolean,
  rematchRequested: Boolean,
  opponentWantsRematch: Boolean,
});

const emit = defineEmits(['exitToLobby', 'rematch']);

const isMyTurn = computed(() => props.game.currentPlayer === props.playerId);
const mySymbol = computed(() => {
  const me = props.game.players?.find(p => p.playerId === props.playerId);
  return me ? me.symbol : '?';
});
</script>
