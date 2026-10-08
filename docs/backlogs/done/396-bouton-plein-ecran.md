# Bouton plein écran dans la barre d'outils

> Itération — barre d'outils de l'appli (`src/app/Viewer.tsx`, `.toolbar-end`)

- Un bouton icône en haut à droite, dans `.toolbar-end`, juste à gauche du bouton Diagnostics (et à gauche de
  Paramètres quand Diagnostics est masqué par `settings.debug.showUnsupportedPanel`) : toujours affiché.
- Un clic bascule le plein écran de la page (`document.documentElement.requestFullscreen()` /
  `document.exitFullscreen()`).
- L'état suit le navigateur (événement `fullscreenchange`, donc aussi la sortie par Échap) : `aria-pressed`, icône
  « agrandir » (quatre coins vers l'extérieur) hors plein écran, « réduire » (coins vers l'intérieur) en plein écran,
  dessinée en SVG 16×16 comme les autres boutons ; `title` « Plein écran » / « Quitter le plein écran ».
- Si le navigateur ne permet pas le plein écran (`document.fullscreenEnabled` faux), le bouton n'est pas affiché.
- **Fini quand :** dans l'appli, le bouton est à gauche de Diagnostics ; un clic passe en plein écran, un second (ou
  Échap) en sort, et l'icône comme `aria-pressed` suivent l'état ; la caméra et le canevas se redimensionnent
  correctement à l'entrée et à la sortie ; `make check` vert.
- Fait : bouton `fullscreen-toggle` dans `.toolbar-end` de `src/app/Viewer.tsx`, avant Diagnostics, masqué si
  `fullscreenEnabled` est faux ; état suivi par `fullscreenchange` (Échap compris) ; infobulle par `useTooltip`, pas
  de `title` natif ; style de l'icône partagé avec Diagnostics, accent en plein écran (`src/app/main.css`). Passe par
  `window.document` : `document` est masqué par le modèle du fichier dans `Viewer`. Moteur non touché : le canevas
  suit par le `ResizeObserver` de l'affichage. Vérifié à l'œil dans l'appli (entrée, sortie, Échap, redimensionnement).
