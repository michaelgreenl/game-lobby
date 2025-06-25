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

app.mount('#app')

