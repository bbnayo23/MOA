import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Phaser alone is ~1.5MB; splitting it buys nothing for a single-page game.
  build: { chunkSizeWarningLimit: 2500 },
});
