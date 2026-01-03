<template>
  <div class="auth-container">
    <form @submit.prevent="handleRegister" class="auth-form">
      <h2>Register</h2>
      <div class="form-group">
        <label for="username">Username</label>
        <input id="username" v-model="username" type="text" required :disabled="isLoading" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <div class="password-input-wrapper">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            @focus="passwordHideButton = true"
            @blur="passwordHideButton = false"
            :disabled="isLoading"
          />
          <button
            v-if="passwordHideButton"
            type="button"
            @click="showPassword = !showPassword"
            class="toggle-password"
            @mousedown.prevent
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
      <div class="form-group">
        <label for="retype-password">Re-type Password</label>
        <div class="password-input-wrapper">
          <input
            id="retype-password"
            v-model="retypePassword"
            :type="showPassword ? 'text' : 'password'"
            required
            @focus="rePasswordHideButton = true"
            @blur="rePasswordHideButton = false"
            :disabled="isLoading"
          />
          <button
            v-if="rePasswordHideButton"
            type="button"
            @click="showPassword = !showPassword"
            @mousedown.prevent
            class="toggle-password"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>
      <ul class="password-requirements">
        <li :class="{ valid: passwordRequirements.length, invalid: !passwordRequirements.length && password }">
          <span class="icon">{{ !password ? '•' : passwordRequirements.length ? '✓' : '✗' }}</span>
          At least 8 characters
        </li>
        <li :class="{ valid: passwordRequirements.uppercase, invalid: !passwordRequirements.uppercase && password }">
          <span class="icon">{{ !password ? '•' : passwordRequirements.uppercase ? '✓' : '✗' }}</span>
          Contains an uppercase letter
        </li>
        <li :class="{ valid: passwordRequirements.number, invalid: !passwordRequirements.number && password }">
          <span class="icon">{{ !password ? '•' : passwordRequirements.number ? '✓' : '✗' }}</span>
          Contains a number
        </li>
      </ul>
      {{ isLoading.value }}

      <button type="submit" :disabled="isLoading">
        <Loader v-if="isLoading" />
        <span v-else> Register </span>
      </button>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
      <p class="form-link">Already have an account? <router-link to="/login">Login</router-link></p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import Loader from '../components/Loader.vue';

const authStore = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const retypePassword = ref('');
const showPassword = ref(false);
const passwordHideButton = ref(false);
const rePasswordHideButton = ref(false);
const errorMessage = ref(null);
const isLoading = ref(false);

const passwordRequirements = computed(() => {
  const length = password.value.length >= 8;
  const uppercase = /[A-Z]/.test(password.value);
  const number = /[0-9]/.test(password.value);
  return { length, uppercase, number };
});

const handleRegister = async () => {
  if (password.value !== retypePassword.value) {
    errorMessage.value = 'Passwords do not match.';
    return;
  }

  if (!Object.values(passwordRequirements.value).every(Boolean)) {
    errorMessage.value = 'Password does not meet all requirements.';
    return;
  }

  errorMessage.value = null;
  isLoading.value = true;
  try {
    const result = await authStore.register(username.value, password.value);

    if (result.success) {
      router.push('/login');
    } else {
      errorMessage.value = result.message || 'Registration failed.';
    }
  } catch (error) {
    errorMessage.value = 'An unexpected error occurred.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<script>
export default {
  name: 'RegisterView',
};
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
      width: 100%;

      &:focus {
        outline: none;
        border-color: $color-accent;
      }
    }
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;

    input {
      padding-right: 60px;
    }

    .toggle-password {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: $color-text-medium;
      cursor: pointer;
      font-size: 0.8rem;

      &:hover {
        color: $color-text-light;
      }
    }
  }

  .password-requirements {
    list-style: none;
    padding: 0;
    margin-top: map.get($spacers, 2);
    font-size: 0.9rem;
    color: $color-text-medium;

    li {
      display: flex;
      align-items: center;
      gap: map.get($spacers, 2);
      margin-bottom: map.get($spacers, 1);

      .icon {
        font-size: 1.2rem;
        line-height: 1;
      }

      &.valid {
        color: $color-success;
        font-weight: $font-weight-semibold;
      }

      &.invalid {
        color: $color-error;
      }
    }
  }

  button[type='submit'] {
    width: 100%;
    padding: map.get($spacers, 2);
    margin-top: map.get($spacers, 3);
    font-size: 1.1rem;
    font-weight: $font-weight-semibold;
    // display: flex;
    // justify-content: center;
    // align-items: center;
    min-height: 48px;

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
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
