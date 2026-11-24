// ESLint configuration: run with `npm run lint` (CI does it on every pull request).
// The app has no build step: js/ and data/ are plain <script> files sharing one global scope,
// so each file's exports are declared below as globals for the others.
const { defineConfig, globalIgnores } = require('eslint/config');
const js = require('@eslint/js');
const globals = require('globals');

module.exports = defineConfig([
  globalIgnores(['node_modules/', '.venv-piper/']),
  {
    files: ['**/*.js', '**/*.mjs'],
    plugins: { js },
    extends: ['js/recommended'],
  },
  {
    // Browser scripts, loaded in this order by index.html. Each also exports through
    // module.exports when it is required by the Node tests.
    files: ['js/**/*.js', 'data/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        module: 'readonly',
        LESSONS: 'readonly',
        AUDIO: 'readonly',
        SYNC_URL: 'readonly',
        SRS: 'readonly',
        Diff: 'readonly',
        Store: 'readonly',
        I18n: 'readonly',
        Merge: 'readonly',
        Sync: 'readonly',
        Speech: 'readonly',
      },
    },
  },
  {
    files: ['tests/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    files: ['tests/**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
  {
    // The Sync server runs on Cloudflare Workers (service-worker style globals).
    files: ['worker/**/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.serviceworker },
  },
]);
