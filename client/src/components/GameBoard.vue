<template>
  <div class="game-board-container">
    <!-- Disconnect message - show prominently at the top -->
    <div v-if="props.opponentDisconnected" class="disconnect-message">
      <p>⚠️ Opponent is disconnected</p>
      <p v-if="props.game.state === 'in_progress'" class="disconnect-timer">
        You will win in {{ props.disconnectCountdown }} seconds if they don't reconnect
      </p>
    </div>

    <div v-if="props.game.state === 'waiting_for_player_2'" class="waiting-game">
      <h2>Waiting for another player to join...</h2>
      <p>Share this game with a friend to start playing!</p>
      <button @click="emit('cancelGame')" class="cancel-button">Cancel Game</button>
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
      <button @click="emit('createNewGame')">New Game</button>
      <button 
        :class="{ disabled: props.opponentDisconnected }" 
        :disabled="props.opponentDisconnected"
        @click="emit('rematch')"
      >
        {{ props.opponentDisconnected ? 'Rematch (Opponent Disconnected)' : 'Rematch' }}
      </button>
    </div>

    <div class="board" :class="{
      disabled: !isMyTurn || props.opponentDisconnected ||
        props.game.state != 'in_progress'
    }">
      <div class="cell" v-for="(cell, index) in props.game.board" :key="index" @click="cellClicked(index)">
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
  disconnectCountdown: Number,
});

const emit = defineEmits(['exitToLobby', 'rematch', 'move', 'cancelGame', 'createNewGame']);

const isMyTurn = computed(() => props.game.currentPlayer === props.playerId);
const mySymbol = computed(() => {
  const me = props.game.players?.find(p => p.playerId === props.playerId);
  return me ? me.symbol : '?';
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

.disconnect-message {
  background-color: #ffebee;
  border: 2px solid #f44336;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  text-align: center;
}

.disconnect-message p {
  margin: 0;
  color: #d32f2f;
  font-weight: bold;
  font-size: 1.1em;
}

.disconnect-timer {
  font-size: 0.8em;
  color: #666;
}

.waiting-game {
  text-align: center;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-bottom: 16px;
}

.waiting-game h2 {
  margin-bottom: 10px;
}

.waiting-game p {
  margin: 0;
}

.cancel-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.cancel-button:hover {
  background-color: #d32f2f;
}
</style>
