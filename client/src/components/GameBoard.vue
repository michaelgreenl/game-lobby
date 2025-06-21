<template>
  <div class="game-board">
    <div v-if="props.game.state === 'waiting_for_player_2'" class="inactive-game">
      <p>Waiting for another player to join...</p>
    </div>

    <div v-else-if="props.game.state === 'in_progress'" class="active-game">
      <h2>Game in Progress</h2>
      <p>Your symbol: {{ mySymbol }}</p>
      <p v-if="isMyTurn">It's your turn!</p>
      <p v-else>Waiting for opponent...</p>
    </div>

    <div v-else-if="props.game.state.includes('game_over')">
      <h2>Game Over!</h2>
      <p v-if="game.state === 'game_over_win'">
        Winner is: {{ game.winner === props.playerId ? 'You!:)' : 'Opponent:`(' }}
      </p>
      <p v-if="game.state === 'game_over_draw'">It's a draw!</p>
      <p v-if="rematchRequested">Waiting for opponent...</p>
      <p v-if="opponentWantsRematch">Opponent wants a rematch!</p>
      <p v-if="opponentDisconnected">Opponent is disconnected</p>
      <button @click="emit('create')">New Game</button>
      <button :class="{ disabled: opponentDisconnected }" @click="emit('rematch', { gameId: game.id })">Rematch</button>
    </div>

    <div class="board" :class="{
      disabled: !isMyTurn || props.opponentDisconnected ||
        props.game.state != 'in_progress'
    }">
      <div class="cell" v-for="(cell, index) in game.board" :key="index" @click="cellClicked(index)">
        {{ cell }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  game: Object,
  playerId: String,
  opponentDisconnected: Boolean,
  rematchRequested: Boolean,
  opponentWantsRematch: Boolean,
});

const emit = defineEmits(['move', 'create', 'rematch']);

const isMyTurn = computed(() => props.game.currentPlayer === props.playerId);
const mySymbol = computed(() => {
  const me = props.game.players.find(p => p.playerId === props.playerId);
  return me ? me.symbol : '?'; // Return our symbol, or '?' if not found
});

const cellClicked = (index) => {
  if (isMyTurn.value && props.game.board[index] === null) {
    emit('move', index);
  }
};
</script>

<style>
.board {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  grid-gap: 5px;
}

.cell {
  width: 100px;
  height: 100px;
  border: 1px solid black;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2em;
  cursor: pointer;
}

.disabled {
  pointer-events: none;
  opacity: 0.6;
}
</style>
