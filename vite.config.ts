/// <reference types="vitest" />
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Le moteur n'est pas remplaçable à chaud (une instance vit dans le composant) :
 * toute modification sous src/engine recharge la page. L'appli de démo restaure
 * ensuite fichier, page et caméra, on reste donc au même endroit.
 */
function engineFullReload(): Plugin {
  return {
    name: 'engine-full-reload',
    apply: 'serve',
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/engine/')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), engineFullReload()],
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
});
