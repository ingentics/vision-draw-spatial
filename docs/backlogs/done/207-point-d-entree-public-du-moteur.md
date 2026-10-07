# Point d'entrée public du moteur

> Dette technique du moteur (API) ; prépare 208

- `src/engine/index.ts` : seul point d'entrée du moteur pour `src/app/` et `src/react/` (moteur, modèle,
  paramètres, stockage, et les briques dont l'UI se sert : palette, styles, commentaires, séquences…).
- `src/index.ts` (API de la bibliothèque) réexporte une partie de `engine/index.ts`, sans changer ce qu'il expose.
- Un lint (`no-restricted-imports`) interdit à `src/app/` et `src/react/` d'importer un chemin plus profond que
  `engine/index.ts`.
- **Fini quand :** `grep -rE "engine/[a-zA-Z]" src/app src/react` ne trouve que `engine'` / `engine/index` ; le lint
  refuse un import interne ; l'API de `dist-lib` inchangée (`make lib`) ; appli inchangée ; `make check` vert.
- Fait : `src/engine/index.ts` exporte, rangé par thème, ce dont se servent `src/app/`, `src/react/` et l'API de la
  bibliothèque (42 modules) ; les 37 fichiers de l'interface importent `…/engine` (un import de valeurs et un de
  types par fichier) ; `src/index.ts` réexporte depuis `./engine`. Règle `no-restricted-imports` dans
  `.eslintrc.cjs` pour `src/app`, `src/react` et `src/index.ts` (essayée sur un import interne : refusé). API de la
  bibliothèque inchangée : les 44 exports de `src/index.ts`, résolus par le compilateur, ont les mêmes noms et
  les mêmes déclarations avant et après (`make lib` non lancé, pour ne pas écraser `dist-lib`). `BONNES_PRATIQUES`
  §5 mis à jour. Vérifié : `make check` ; appli rechargée sans erreur.
