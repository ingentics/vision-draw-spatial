# Animation en continu des Metamorph prêtes

> Dette vue à l'audit 542 (reprise de 539) — tronc

- `core/render/animation.ts:69` crée une `Color` par image et par mesh, et `animateObjects` parcourt toute la scène à
  chaque image (`rendering.ts:151`) : tant qu'une Metamorph est `ready`, le rendu tourne sans fin.
