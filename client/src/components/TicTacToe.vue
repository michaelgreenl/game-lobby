<template>
  <div class="board" :class="{
    disabled: !isMyTurn || props.opponentDisconnected ||
      props.game.state != 'in_progress'
  }">
    <div class="cell" v-for="(cell, index) in game.board" :key="index" @click="cellClicked(index)">
      {{ cell }}
    </div>
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/gameStore.js';

const props = defineProps({
  game: Object,
  opponentDisconnected: Boolean,
  isMyTurn: Boolean,
});

const gameStore = useGameStore();

const cellClicked = (index) => {
  if (props.isMyTurn && props.game.board[index] === null) {
    gameStore.makeMove(index);
  }
};
</script>

<script>
export default {
  name: 'GameView',
}
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
