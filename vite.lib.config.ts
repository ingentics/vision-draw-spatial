import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Build de la bibliothèque (SPEC §18) : `dist-lib/drawio-spatial.js` (module ES), sa feuille de style
 * et ses types (`tsconfig.lib.json`). React est fourni par l'application hôte ; le reste (Three.js,
 * troika, pako, xmldom) est inclus.
 */
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'drawio-spatial',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
  },
});
