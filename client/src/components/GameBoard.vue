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
    <div v-else-if="props.game.state?.includes('game_over')" class="game-over-section">
      <h2>Game Over!</h2>
      <p v-if="props.game.state === 'game_over_win'">
        Winner is: {{ props.game.winner === props.playerId ? 'You!:)' : 'Opponent:`(' }}
      </p>
      <p v-if="props.game.state === 'game_over_draw'">It's a draw!</p>
      <p v-if="props.rematchRequested" class="rematch-status">Waiting for opponent...</p>
      <p v-if="props.opponentWantsRematch" class="rematch-status">Opponent wants a rematch!</p>
      <div class="game-actions">
        <button @click="emit('createNewGame')" class="new-game-button">New Game</button>
        <button :class="{ disabled: props.opponentDisconnected }" :disabled="props.opponentDisconnected"
          @click="emit('rematch')" class="rematch-button">
          {{ props.opponentDisconnected ? 'Rematch (Opponent Disconnected)' : 'Rematch' }}
        </button>
      </div>
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

<style lang="scss" scoped>
@use 'sass:map';
@use 'sass:color';

.game-board-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: map.get($spacers, 4);
  padding: map.get($spacers, 3);
  background-color: $color-background-medium;
  border-radius: $border-radius;
  box-shadow: $box-shadow;
  max-width: 500px;
  margin: 0 auto;

  @include bp-md-tablet {
    padding: map.get($spacers, 5);
  }
}

.disconnect-message {
  background-color: color.adjust($color-error, $lightness: 10%);
  border: 1px solid $color-error;
  border-radius: $border-radius;
  padding: map.get($spacers, 3);
  text-align: center;
  width: 100%;

  p {
    margin: 0;
    color: $color-error;
    font-weight: $font-weight-semibold;
  }

  .disconnect-timer {
    font-size: 0.9em;
    color: color.adjust($color-error, $lightness: 10%);
  }
}

.waiting-game,
.active-game,
.game-over-section {
  text-align: center;
  width: 100%;

  h2 {
    color: $color-text-light;
    margin-bottom: map.get($spacers, 2);
  }

  p {
    color: $color-text-medium;
    margin-bottom: map.get($spacers, 2);
  }
}

.cancel-button,
.new-game-button,
.rematch-button {
  padding: map.get($spacers, 2) map.get($spacers, 3);
  font-size: 1rem;
  font-weight: $font-weight-semibold;
  border-radius: $border-radius;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.cancel-button {
  background-color: $color-error;
  color: $color-text-light;

  &:hover {
    background-color: color.adjust($color-error, $lightness: 10%);
  }
}

.game-over-section {
  .rematch-status {
    font-style: italic;
    color: $color-text-dark;
  }

  .game-actions {
    display: flex;
    gap: map.get($spacers, 3);
    justify-content: center;
    margin-top: map.get($spacers, 4);

    .new-game-button {
      background-color: $color-accent;
      color: $color-text-light;

      &:hover {
        background-color: color.adjust($color-accent, $lightness: 10%);
      }
    }

    .rematch-button {
      background-color: $color-success;
      color: $color-text-light;

      &:hover {
        background-color: color.adjust($color-success, $lightness: 10%);
      }

      &.disabled {
        background-color: $color-background-light;
        color: $color-text-dark;
        cursor: not-allowed;
      }
    }
  }
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  grid-template-rows: repeat(3, 100px);
  gap: map.get($spacers, 1);
  background-color: $color-border;
  border-radius: $border-radius;
  overflow: hidden;
  box-shadow: $box-shadow-sm;

  .cell {
    width: 100%;
    height: 100%;
    background-color: $color-background-dark;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 3em;
    font-weight: $font-weight-bold;
    color: $color-white;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: color.adjust($color-background-dark, $lightness: 5%);
    }
  }

  &.disabled {
    pointer-events: none;
    opacity: 0.7;
  }
}
</style>
