<template>
  <div class="auth-container">
    <form @submit.prevent="handleLogin" class="auth-form">
      <h2>Login</h2>
      <div class="form-group">
        <label for="username">Username</label>
        <input id="username" v-model="username" type="text" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" required />
      </div>
      <button type="submit">Login</button>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p class="form-link">
        Don't have an account? <router-link to="/register">Register</router-link>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const username = ref('');
const password = ref('');
const errorMessage = ref(null);

const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  errorMessage.value = null; // Reset error message
  const success = await authStore.login(username.value, password.value);

  if (success) {
    // Redirect to the lobby/home page on successful login
    router.push('/');
  } else {
    // Display an error message if login fails
    errorMessage.value = 'Invalid username or password.';
    password.value = ''; // Clear password field
  }
};
</script>

<script>
export default {
  name: 'LoginView',
}
</script>

<style lang="scss" scoped>
@use 'sass:map';

.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px); // Adjust based on nav height
  padding: map.get($spacers, 4);
}

.auth-form {
  background-color: $color-background-medium;
  padding: map.get($spacers, 5);
  border-radius: $border-radius;
  box-shadow: $box-shadow;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: map.get($spacers, 3);

  h2 {
    text-align: center;
    color: $color-text-light;
    margin-bottom: map.get($spacers, 4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: map.get($spacers, 1);

    label {
      color: $color-text-medium;
      font-size: 0.9rem;
    }

    input {
      padding: map.get($spacers, 2);
      border: 1px solid $color-border;
      border-radius: $border-radius;
      background-color: $color-background-dark;
      color: $color-text-light;

      &:focus {
        outline: none;
        border-color: $color-accent;
      }
    }
  }

  button[type="submit"] {
    width: 100%;
    padding: map.get($spacers, 2);
    margin-top: map.get($spacers, 3);
    font-size: 1.1rem;
    font-weight: $font-weight-semibold;
  }

  .error-message {
    color: $color-error;
    text-align: center;
    margin-top: map.get($spacers, 2);
  }

  .form-link {
    text-align: center;
    margin-top: map.get($spacers, 3);

    a {
      color: $color-blue;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
