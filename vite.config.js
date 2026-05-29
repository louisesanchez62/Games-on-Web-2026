import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3000 },
  // Havok est livré avec un .wasm — on dit à Vite de ne pas pré-bundler le
  // package, le module gère seul son chargement WASM.
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
  },
});