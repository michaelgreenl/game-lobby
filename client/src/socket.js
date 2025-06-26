import { io } from 'socket.io-client';

const URL = 'http://localhost:3000';

export const socket = io(URL, {
  auth: {
    token: localStorage.getItem('token'),
  },
  autoConnect: false,  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  forceNew: false,
  transports: ['websocket', 'polling']
});
