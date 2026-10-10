const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  { ignores: ['dist/**', 'docs/**', '.chrome*/**', '.expo/**', 'artifacts/**', 'node_modules/**'] },
  expoConfig,
  {
    // Browser/CDP helpers run in Node, where Buffer is a built-in global.
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { Buffer: 'readonly' } },
  },
  {
    // Existing games keep compiler-readiness diagnostics visible during staged migration.
    // The new race module retains the full Expo error-level checks.
    files: ['src/games/{block-island,energy-defense,floating-market,planet-rescue,rhythm-bakery,royal-artillery,space-pets,terrain-racing,treasure-dive,vault-code}/**/*.{ts,tsx}'],
    rules: { 'react-hooks/purity': 'warn', 'react-hooks/immutability': 'warn' },
  },
]);
