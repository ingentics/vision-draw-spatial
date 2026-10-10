# Police par forme : feutre pour les labels des post-it Event storming

> Moteur — texte (`core/render/troikaText.ts`, `FontSet`) ; demandé par le mode Event storming (475)

- Une forme peut demander une police nommée pour un texte (ex. `fontFamily=Permanent Marker`) : `FontSet` accepte des
  polices en plus de Roboto et Roboto Mono, choisies par `fontFamily` (dessin, mesure, éditeur en place).
- Police feutre : Permanent Marker en `.woff` via `@fontsource`, ajoutée par `make lock`, chargée par l'appli comme
  Roboto (`src/app/Viewer.tsx`).
- Le label des post-it du mode Event storming passe en feutre gras (`shapes/common/stickyShape.ts`).
- **Fini quand :** les labels des post-it de `tests/fixtures/eventstorming.drawio` sont dessinés en feutre ; la mesure
  (réduction à 10, « … ») suit cette police ; `make check` vert.
