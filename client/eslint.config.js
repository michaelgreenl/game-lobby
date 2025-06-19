import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // Global configurations for all files
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser, // Standard browser globals
        node: true,         // Node.js globals (for config files, etc.)
        es2021: true,
      },
    },
    // This allows eslint to resolve the `@` alias from vite.config.js
    settings: {
        'import/resolver': {
            alias: {
                map: [['@', './src']],
                extensions: ['.js', '.vue'],
            },
        },
    },
  },

  // Applies to all JS and Vue files
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  // The Prettier config MUST be last. It turns off conflicting rules.
  eslintConfigPrettier,
];

