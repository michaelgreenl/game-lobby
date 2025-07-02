import { io } from 'socket.io-client';
import router from './router';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

socket.on('connect_error', (err) => {
  if (err.message === 'Authentication error: Invalid token') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.disconnect();
    router.push('/login');
  }
});
