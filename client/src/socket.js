import { io } from 'socket.io-client';
import { getPlayerId } from './stores/playerStore';

const URL = 'http://localhost:3000';

export const socket = io(URL, {
  auth: {
    playerId: getPlayerId()
  },
  autoConnect: false,
});
