# Animation en continu des Metamorph prêtes

> Dette vue à l'audit 542 (reprise de 539) — tronc

- `core/render/animation.ts:69` crée une `Color` par image et par mesh, et `animateObjects` parcourt toute la scène à
  chaque image (`rendering.ts:151`) : tant qu'une Metamorph est `ready`, le rendu tourne sans fin.

- Fait (audit 542) : `core/render/animation.ts` : les couleurs de travail d'un objet animé sont créées une fois
  (`userData.spinColors`) ; `animateScene` rend l'attente avant la prochaine image utile (0 si un objet bouge, la fin du
  repos le plus court si tous les objets sont dans un temps de pause de leur pulsation, `restLeft`) ; `Rendering`
  attend alors la fin du repos (`setTimeout`, annulé à la fin du moteur) au lieu de redessiner à chaque image. Le
  parcours de la scène à chaque image rendue reste (une image ne se rend que si quelque chose change). Écart de
  comportement : aucun à l'écran ; pendant les pauses du halo (moitié du temps pour une Metamorph prête), plus
  d'images. Tests : `animation.test.ts` (`restLeft`, `animateScene`). Vérifié dans l'appli (`metamorph.drawio`) : halo
  qui pulse puis disparaît pendant ses pauses.
