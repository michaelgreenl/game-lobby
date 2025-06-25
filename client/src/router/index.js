import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import LoginView from '../views/Login.vue';
import RegisterView from '../views/Register.vue';
import LobbyView from '../views/Lobby.vue';
import GameView from '../views/Game.vue';

const routes = [
    { path: '/', redirect: '/lobby' },
    { path: '/lobby', name: 'Lobby', component: LobbyView, meta: { requiresAuth: true } },
    { path: '/game/:id', name: 'Game', component: GameView, meta: { requiresAuth: true } },
    { path: '/login', name: 'Login', component: LoginView },
    { path: '/register', name: 'Register', component: RegisterView }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const auth = useAuthStore();
    const requiresAuth = to.meta.requiresAuth;

    if (requiresAuth && !auth.isAuthenticated) {
        next('/login'); // Redirect to login page
    }
    else if ((to.name === 'Login' || to.name === 'Register') && auth.isAuthenticated) {
        next('/'); // Redirect them to the home page
    }
    else {
        // Else user is authorized
        next();
    }
});

export default router;

