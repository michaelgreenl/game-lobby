<template>
  <div id="app-layout">
    <nav>
      <div class="nav-title">
        <LogoSVG fill="#fff" />
        <h1>Game Lobby</h1>
      </div>
      <div v-if="auth.isAuthenticated" class="nav-router">
        <span>Welcome, {{ auth.user.username }}!</span>
        <button @click="auth.logout()">Logout</button>
      </div>
    </nav>

    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from './stores/authStore';
import LogoSVG from './components/svgs/LogoSVG.vue';
const auth = useAuthStore();
</script>

<style lang="scss" scoped>
@use 'sass:map';
@use 'sass:color';

#app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: map.get($spacers, 3);
  background-color: $color-background-medium;
  border-bottom: 1px solid $color-border;
  box-shadow: $box-shadow-sm;

  h1 {
    margin: 0;
    font-size: $font-size-base * 1.5;

    @include bp-md-tablet {
      font-size: $font-size-base * 2;
    }
  }

  .nav-title {
    display: flex;
    align-items: center;
    gap: map.get($spacers, 2);
  }

  .nav-router {
    display: flex;
    align-items: center;
    gap: map.get($spacers, 3);

    span {
      color: $color-text-light;
      font-weight: $font-weight-semibold;
    }

    a {
      color: $color-accent;
      text-decoration: none;
      padding: map.get($spacers, 1) map.get($spacers, 2);
      border-radius: $border-radius;
      transition: background-color 0.3s ease;

      &:hover {
        background-color: rgba($color-accent, 0.2);
      }
    }

    button {
      background-color: $color-accent;
      color: $color-text-light;
      border: none;
      padding: map.get($spacers, 1) map.get($spacers, 2);
      border-radius: $border-radius;
      cursor: pointer;
      transition: background-color 0.3s ease;

      &:hover {
        background-color: color.adjust($color-accent, $lightness: 10%);
      }
    }
  }
}

main {
  flex-grow: 1;
  padding: map.get($spacers, 3);
}
</style>

<style lang="scss">
@use 'sass:map';
@use 'sass:color';

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: $color-background-dark;
  font-family: $font-family-sans-serif;
  color: $color-text-light;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  color: $color-text-light;
  margin-top: 0;
  margin-bottom: map.get($spacers, 2);
}

p {
  margin-top: 0;
  margin-bottom: map.get($spacers, 2);
}

a {
  color: $color-accent;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

button {
  background-color: $color-accent;
  color: $color-text-light;
  border: none;
  padding: map.get($spacers, 2) map.get($spacers, 2);
  border-radius: $border-radius;
  cursor: pointer;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: color.adjust($color-accent, $lightness: 10%);
  }

  &:disabled {
    background-color: $color-background-light;
    color: $color-text-dark;
    cursor: not-allowed;
  }
}

input[type="text"],
input[type="password"],
input[type="email"] {
  background-color: $color-background-medium;
  border: 1px solid $color-border;
  color: $color-text-light;
  padding: map.get($spacers, 2);
  border-radius: $border-radius;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: $color-accent;
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: map.get($spacers, 3);
}

.text-center {
  text-align: center;
}

.error-message {
  color: $color-error;
  font-size: 0.9rem;
  margin-top: map.get($spacers, 1);
}

.success-message {
  color: $color-success;
  font-size: 0.9rem;
  margin-top: map.get($spacers, 1);
}
</style>
