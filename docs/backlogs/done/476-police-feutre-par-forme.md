# Police par forme : feutre pour les labels des post-it Event storming

> Moteur — texte (`core/render/troikaText.ts`, `FontSet`) ; demandé par le mode Event storming (475)

- Une forme peut demander une police nommée pour un texte (ex. `fontFamily=Permanent Marker`) : `FontSet` accepte des
  polices en plus de Roboto et Roboto Mono, choisies par `fontFamily` (dessin, mesure, éditeur en place).
- Police feutre : Permanent Marker en `.woff` via `@fontsource`, ajoutée par `make lock`, chargée par l'appli comme
  Roboto (`src/app/Viewer.tsx`).
- Le label des post-it du mode Event storming passe en feutre gras (`shapes/common/stickyShape.ts`).
- **Fini quand :** les labels des post-it de `tests/fixtures/eventstorming.drawio` sont dessinés en feutre ; la mesure
  (réduction à 10, « … ») suit cette police ; `make check` vert.
- Fait : `FontSet.families` (`core/render/troikaText.ts`) : polices nommées choisies par le `fontFamily` d'un texte
  (`pickFont`), chargées et mesurées comme Roboto (`createMeasure`) ; une seule graisse chacune, gras et italique
  dessinés avec elle. Permanent Marker (`@fontsource/permanent-marker` 5.3.0, `make lock`) : URLs passées au moteur
  depuis `src/app/fonts.ts` (`FONTS`, sorti de `Viewer.tsx`), CSS chargée dans `main.tsx`, éditeur en place à la même
  police (`editorFontFamily`, `LabelEditor.tsx`). Label des post-it en `fontFamily=Permanent Marker`, mesuré dans
  cette police (`stickyLayout.ts`, `STICKY.labelFont`). Test `tests/engine/core/render/fonts.test.ts` ; doc
  COMPOSANT (`fonts.families`), SPEC §14.5. Vérifié à l'œil sur `eventstorming.drawio` : labels en feutre. Écart : le
  serveur partagé a reçu le paquet par `npm install --no-save` dans son conteneur (le prochain `make dev` le prend de
  l'image reconstruite).
