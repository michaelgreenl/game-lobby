import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import LoginView from '../views/Login.vue';
import RegisterView from '../views/Register.vue';
import LobbyView from '../views/Lobby.vue';
import GameView from '../views/Game.vue';

const DEFAULT_TITLE = 'Game Lobby';

const routes = [
    { path: '/', redirect: '/lobby' },
    { path: '/lobby', name: 'Lobby', component: LobbyView, meta: { requiresAuth: true } },
    { path: '/game/:id', name: 'Game', component: GameView, meta: { requiresAuth: true } },
    { path: '/login', name: 'Login', component: LoginView, meta: { title: 'Login' } },
    { path: '/register', name: 'Register', component: RegisterView, meta: { title: 'Register' }}
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(async (to, from, next) => {
    const auth = useAuthStore();
    const gameStore = useGameStore();
    const requiresAuth = to.meta.requiresAuth;

    if (requiresAuth && !auth.isAuthenticated) {
        next('/login');
    }
    else if ((to.name === 'Login' || to.name === 'Register') && auth.isAuthenticated) {
        next('/');
    }
    else if (to.name === 'Lobby' && auth.isAuthenticated) {
        // Check if user has an active game before showing lobby
        const hasActiveGame = gameStore.checkForActiveGame();
        if (hasActiveGame) {
            // User will be redirected to their game, don't proceed to lobby
            return;
        }
        next(); // Show lobby if no active game
    }
    else if (to.name === 'Game' && auth.isAuthenticated) {
        // User is trying to access a game page
        const targetGameId = to.params.id;

        // Check if user is already in a different game
        if (gameStore.game && gameStore.game.id && gameStore.game.id !== targetGameId) {
            // User is in a different game, redirect them to their actual game
            next({ name: 'Game', params: { id: gameStore.game.id } });
            return;
        }

        // Check if user has an active game in the games list that's different from target
        const activeGame = gameStore.games.find(g =>
            g.players.some(p => p.playerId === auth.user?.id) && g.id !== targetGameId
        );

        if (activeGame) {
            // User has an active game that's different from the target, redirect to their game
            next({ name: 'Game', params: { id: activeGame.id } });
            return;
        }

        // User can proceed to the target game
        next();
    }
    else {
        // Else user is authorized
        next();
    }
});

router.afterEach((to) => {
  const auth = useAuthStore();
  const requiresAuth = to.meta.requiresAuth;

  let title = DEFAULT_TITLE;

  if (requiresAuth && auth.isAuthenticated) {
    title += ' | ' + auth.user.username;
  } else {
    title += ' | ' + to.meta.title;
  }

  document.title = title;
})

export default router;

