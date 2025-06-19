import { v4 as uuidv4 } from 'uuid';

const PLAYER_ID_KEY = 'tic-tac-toe-player-id';

export function getPlayerId() {
  let playerId = localStorage.getItem(PLAYER_ID_KEY);

  if (!playerId) {
    playerId = uuidv4();
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }

  return playerId;
}
