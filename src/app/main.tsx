import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Police des textes du plan (Roboto, comme le rendu SDF) : l'éditeur de texte en place l'utilise aussi.
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-400-italic.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/roboto/latin-700-italic.css';
import './main.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root introuvable');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// L'appli occupe la fenêtre telle quelle : pas de zoom de la page par pincement du trackpad (Ctrl +
// molette pour Chrome / Electron, gestes pour Safari). Sur le canvas, le pincement zoome la vue
// (le moteur le traite avant) ; ailleurs, il agrandirait toute la page, coupée à droite et en bas.
// Dé-pincer reste permis tant que la page est agrandie (Chrome garde ce zoom, même au rechargement).
window.addEventListener(
  'wheel',
  (event) => {
    if (!event.ctrlKey) return;
    const zoomedIn = (window.visualViewport?.scale ?? 1) > 1.001;
    if (!(zoomedIn && event.deltaY > 0)) event.preventDefault();
  },
  { passive: false },
);
for (const type of ['gesturestart', 'gesturechange']) window.addEventListener(type, (event) => event.preventDefault());
