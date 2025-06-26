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

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 50px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 300px;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.error-message {
  color: red;
}

.form-link {
  text-align: center;
  margin-top: 10px;
}
</style>
