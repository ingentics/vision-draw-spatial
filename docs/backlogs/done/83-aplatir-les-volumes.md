# Aplatir les volumes à la touche V

> Itération — rendu iso / 3D et raccourcis

- En iso ou en 3D, la touche **V** (réglable dans les raccourcis) aplatit les volumes : rendu comme si l'épaisseur
  était nulle (formes à plat, caméra inchangée). Un second appui les rétablit. En 2D, la touche n'a aucun effet.
- État passager du moteur, non enregistré (ni paramètres, ni fichier).
- Tant que les volumes sont aplatis (en iso ou 3D), une icône apparaît en bas à droite de la zone de dessin, à
  gauche de la mini-carte ; un clic dessus rétablit les volumes.
- **Fini quand :** en iso, V aplatit les blocs et affiche l'icône, V ou un clic sur l'icône les rétablit ; en 2D, V
  ne fait rien ; `make check` vert.
- Fait :
  - Moteur : état passager `flattened` (`setFlattened`, `toggleFlatten`, `isFlattened`, événement
    `flattenChange`) ; `requestedLevel` rend à plat quand il est levé, sans toucher caméra ni réglages ; sans effet
    en 2D ; pas de fondu 2D ↔ volume pendant l'aplatissement.
  - Raccourci `controls.shortcuts.toggleFlatten` (`v`), réglable dans les paramètres (`controls.ts`,
    `settings.ts`, `SettingsPanel.tsx`).
  - Composant `DrawioSpatial` : coin bas droit regroupé (`.drawio-corner`), icône `.drawio-flatten` à gauche de la
    mini-carte, visible en iso / 3D tant que les volumes sont aplatis ; un clic les rétablit. SPEC §9 (tableau des
    contrôles).
  - Vérifié dans l'appli : en 2D, V ne fait rien ; en iso puis en 3D, V aplatit les blocs et affiche l'icône, V ou
    un clic sur l'icône les rétablit.
