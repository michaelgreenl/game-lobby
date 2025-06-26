import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { socket } from '../socket.js';
import apiFetch from '../api.js';
import router from '../router';
import { useGameStore } from './gameStore.js';

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token'));
    const user = ref(JSON.parse(localStorage.getItem('user')));

    function setToken(newToken) {
        token.value = newToken;
        localStorage.setItem('token', newToken);
    }

    function setUser(newUser) {
        user.value = newUser;
        localStorage.setItem('user', JSON.stringify(newUser));
    }

    async function register(username, password) {
        try {
            await apiFetch('/auth/register', {
                method: 'POST',
                body: { username, password },
            });
            return { success: true };
        } catch (error) {
            console.error('Registration failed:', error.message);
            return { success: false, message: error.message };
        }
    }

    async function login(username, password) {
      try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: { username, password },
        });

        // --- Update State ---
        setToken(data.token);
        setUser({ id: data.userId, username: data.username });

        // --- Re-authenticate and Reconnect Socket ---
        socket.auth.token = data.token;
        socket.connect();
        const gameStore = useGameStore();
        gameStore.initializeSocketListeners();

        return true;
      } catch (error) {
        console.error('Login failed:', error.message);
        return false;
      }
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        token.value = null;
        user.value = null;
        socket.disconnect();
        router.push({ name: 'Login' });
    }

    const isAuthenticated = computed(() => !!token.value);

    return { token, user, register, login, logout, isAuthenticated, setToken, setUser };
});
