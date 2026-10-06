# Découpage des contrôles clavier et souris

> Refactorisation — moteur (`src/engine/interaction/controls.ts`, ≈ 840 lignes) ; suite de 162

- `controls.ts` mêle raccourcis clavier, inertie de la caméra (fonctions pures) et `CameraController`
  (≈ 490 lignes, gestionnaires pointeur et clavier).
- Il devient un dossier `interaction/controls/` dont `index.ts` est la façade (mêmes exports) : réglages et
  raccourcis, inertie, et le contrôleur dont les gestionnaires pointeur et clavier sortent dans leurs fichiers.
- Aucun changement de comportement.
- **Fini quand :** plus aucun fichier du dossier au-delà de ≈ 350 lignes ; déplacement, rotation, zoom, sélection
  par zone, raccourcis et flèches du clavier fonctionnent comme avant dans l'appli ; `make check` vert.
- Fait : `controls.ts` (19 lignes) ne garde que la façade du dossier `controls/` : `shortcuts.ts` (raccourcis,
  ordre de dessin), `settings.ts` (réglages par défaut), `motion.ts` (touches de déplacement, molette, inertie),
  `host.ts` (`CameraHost`), et le contrôleur découpé en `context.ts` (état partagé : réglages, Espace, survol,
  glisser), `drift.ts` (déplacement continu et glissade), `pointer.ts` (molette, glisser, clics, rectangle de
  sélection), `keyboard.ts` (raccourcis, touches maintenues) et `CameraController.ts` (assemblage, 54 lignes) ; le
  plus gros fichier fait 257 lignes. Code des gestionnaires repris tel quel. Vérifié dans l'appli : molette,
  sélection au clic et par zone, déplacement, flèches du clavier, Échap, annuler, bascules 2D / iso / 3D.
  SPEC §4.2 à jour.
