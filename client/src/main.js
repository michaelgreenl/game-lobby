import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/authStore'
import { useGameStore } from './stores/gameStore'
import { socket } from './socket'

const app = createApp(App)
const pinia = createPinia()

pinia.use(({ store }) => {
  store.$router = router
})

app.use(pinia)
app.use(router)

const authStore = useAuthStore()
const gameStore = useGameStore()

if (authStore.isAuthenticated) {
  socket.auth.token = authStore.token;
  socket.connect();
  gameStore.initializeSocketListeners();
}

// Prevent false disconnections when user opens/closes other tabs
let disconnectTimeout = null;

function handleVisibilityChange() {
  if (document.hidden) {
    // Page is hidden (user switched tabs or minimized window)
    // Don't disconnect immediately, give them time to come back
    if (disconnectTimeout) {
      clearTimeout(disconnectTimeout);
    }
    disconnectTimeout = setTimeout(() => {
      if (document.hidden && socket.connected) {
        // Only disconnect if still hidden after 5 seconds
        socket.disconnect();
      }
    }, 5000);
  } else {
    // Page is visible again
    if (disconnectTimeout) {
      clearTimeout(disconnectTimeout);
      disconnectTimeout = null;
    }

    // Reconnect if disconnected
    if (!socket.connected && authStore.isAuthenticated) {
      socket.auth.token = authStore.token;
      socket.connect();
    }
  }
}

function handleBeforeUnload(event) {
  // Only show warning if user is in an active game
  if (gameStore.game && gameStore.game.id && gameStore.game.state === 'in_progress') {
    event.preventDefault();
    event.returnValue = 'You are currently in a game. Are you sure you want to leave?';
    return event.returnValue;
  }
}

// Add event listeners
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('beforeunload', handleBeforeUnload);

app.mount('#app')

