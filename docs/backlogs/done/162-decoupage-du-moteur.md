# Découpage du moteur en domaines

> Refactorisation — moteur (`src/engine/Engine.ts`, ≈ 5 000 lignes)

- `Engine.ts` reste la façade publique (mêmes méthodes, mêmes types exportés) : il délègue à `src/engine/core/`.
- `src/engine/core/` : `EngineCore` (infrastructure, câblage) et un dossier par domaine fonctionnel, avec
  sous-domaines au besoin : `runtime/` (rendu, viewport, paramètres), `document/` (document, pages, annulation),
  `view/` (caméra, modes de vue, niveaux, scène, graphe, mini-carte), `selection/`, `input/`, `navigation/`
  (liens, retour, transitions), `modes/`, `edit/` (cibles modifiables, poignées, flèches, glisser, textes,
  commandes).
- Chaque domaine porte son état ; aucun changement de comportement.
- Un commit par étape (un ou plusieurs domaines extraits), l'appli restant fonctionnelle à chaque étape.
- **Fini quand :** `Engine.ts` ne contient plus que la façade, chaque domaine est dans `core/` ; navigation,
  sélection, édition (déplacer, redimensionner, connecter, textes, copier / coller, annuler), vues 2D / iso / 3D,
  transitions et graphe fonctionnent comme avant dans l'appli ; `make check` vert.
- Fait : `Engine.ts` (807 lignes) ne garde que l'API (119 méthodes, mêmes signatures, rangées par domaine) et délègue à
  `core/EngineCore.ts` (≈ 200 lignes : infrastructure partagée, câblage, cycle de vie). 49 fichiers de domaine dans
  `core/runtime`, `document`, `view`, `selection`, `input`, `navigation`, `modes` et `edit/` (`edges/`, `drag/`,
  `text/`, `commands/`) ; chaque domaine porte son état, ce qui ne sert qu'à lui est privé. Au passage : écriture
  au lâcher d'un glisser découpée par type, mise en valeur de la sélection découpée en étapes, branchement des
  contrôles sorti du constructeur. Un commit par étape, `make check` vert à chacune ; vérifié dans l'appli à chaque
  étape (2D / iso / 3D, aplatir, graphe et retour, mini-carte, sélection simple / multiple / par zone, déplacer,
  redimensionner, connecter, bouts et segments de flèche, éditeur de texte, supprimer, dupliquer, flèches du
  clavier, palette, annuler). SPEC §4.2 mise à jour.
