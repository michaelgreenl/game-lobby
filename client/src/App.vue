<template>
  <div id="app-layout">
    <nav>
      <h1>Game Lobby</h1>
      <div v-if="auth.isAuthenticated">
        <span>Welcome, {{ auth.user.username }}!</span>
        <button @click="auth.logout()">Logout</button>
      </div>
      <div v-else>
        <router-link to="/login">Login</router-link>
        <router-link to="/register">Register</router-link>
      </div>
    </nav>

    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from './stores/authStore';
const auth = useAuthStore();
</script>

<style>
#app,
body,
html {
  height: 100%;
  margin: 0;
  padding: 0;
  background: #282828;
}

h1,
h2,
h3,
h4,
a,
li,
span {
  color: #fff;
}

nav {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #ccc;
}
</style>
